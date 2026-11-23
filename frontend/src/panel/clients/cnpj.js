import {
  $,
  cleanDocument,
  fmtCnpj,
  isCnpj,
  isoDate,
  validCnpj,
  validCpf,
  yes,
} from '../shared/format.js';
import { panelConnection, panelWorkspace } from '../state/workspace.js';

let cnpjLookupTimer,
  cnpjController,
  cnpjLookupSeq = 0,
  cnpjFetchedValue = '';

let filledRegistry = new Map();

const registryKeys = [
  'name',
  'tradeName',
  'segment',
  'activityCode',
  'registryStatus',
  'legalNature',
  'companySize',
  'openingDate',
  'zipCode',
  'address',
  'city',
  'uf',
  'phone',
  'email',
];

const proxyBase = document.querySelector('meta[name="clyriva-cnpj-proxy"]')?.content;

const CNPJ_SOURCES = [
  {
    name: 'BrasilAPI',
    path: 'brasilapi',
    base: 'https://brasilapi.com.br/api/cnpj/v1/',
  },
  {
    name: 'CNPJ.ws',
    path: 'cnpjws',
    base: 'https://publica.cnpj.ws/cnpj/',
  },
];

function cancelCnpjLookup() {
  clearTimeout(cnpjLookupTimer);
  cnpjController?.abort();
  cnpjController = null;
  cnpjLookupSeq++;
  const button = $('#lookup-cnpj');
  if (button) {
    button.disabled = false;
    button.textContent = 'Buscar CNPJ';
  }
  cnpjFetchedValue = '';
}

function lookupStatus(text, kind = 'info') {
  const target = $('#cnpj-lookup-status');
  if (target) {
    target.textContent = text;
    target.dataset.kind = kind;
  }
}

function documentChanged(input) {
  const c = cleanDocument(input.value),
    form = input.form;
  cancelCnpjLookup();
  if (form.dataset.lookupDoc !== c) {
    for (const [key, previous] of filledRegistry) {
      const el = form.elements.namedItem(key);
      if (el && el.value === previous) el.value = key === 'regime' ? 'Outro' : '';
    }
    filledRegistry.clear();
    form.elements.cnpjLookupAt.value = '';
    form.elements.cnpjLookupSource.value = '';
    const foot = form.querySelector('.cnpj-source');
    if (foot)
      foot.textContent = 'Documento alterado. Consulte o CNPJ para atualizar a origem dos dados.';
  }
  if (!isCnpj(c))
    return lookupStatus(
      c.length === 11
        ? validCpf(c)
          ? 'CPF válido. Preenchimento manual.'
          : 'CPF inválido. Confira os dígitos verificadores.'
        : '',
      c.length === 11 && !validCpf(c) ? 'warn' : 'info',
    );
  if (!validCnpj(c))
    return lookupStatus('CNPJ inválido. Confira os dígitos verificadores.', 'warn');
  lookupStatus('CNPJ válido. Consultando em instantes…');
  cnpjLookupTimer = setTimeout(() => lookupCnpj(), 450);
}

function normalizeCnpjResult(raw, source, requested) {
  const ws = source === 'CNPJ.ws',
    est = ws ? raw?.estabelecimento : raw;
  if (
    !est ||
    cleanDocument(est.cnpj) !== requested ||
    typeof raw.razao_social !== 'string' ||
    !raw.razao_social.trim()
  )
    throw Error('Resposta sem identificação correspondente ao CNPJ consultado.');
  const text = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');
  const email = text(est.email);
  return {
    name: raw.razao_social.trim(),
    tradeName: text(est.nome_fantasia),
    segment: text(ws ? est.atividade_principal?.descricao : raw.cnae_fiscal_descricao),
    activityCode: text(ws ? est.atividade_principal?.id : raw.cnae_fiscal),
    registryStatus: text(ws ? est.situacao_cadastral : raw.descricao_situacao_cadastral),
    legalNature: text(ws ? raw.natureza_juridica?.descricao : raw.natureza_juridica),
    companySize: text(ws ? raw.porte?.descricao : raw.porte || raw.descricao_porte),
    openingDate: isoDate(est.data_inicio_atividade),
    zipCode: text(est.cep).replace(/\D/g, ''),
    address: [
      est.descricao_tipo_de_logradouro || est.tipo_logradouro,
      est.logradouro,
      est.numero,
      est.complemento,
      est.bairro,
    ]
      .map(text)
      .filter(Boolean)
      .join(', '),
    city: text(ws ? est.cidade?.nome : raw.municipio),
    uf: text(ws ? est.estado?.sigla : raw.uf),
    phone: ws
      ? [est.ddd1, est.telefone1].map(text).filter(Boolean).join(' ')
      : text(raw.ddd_telefone1),
    email: /^[^\s@;]+@[^\s@;]+\.[^\s@;]+$/.test(email) ? email : '',
    regime: yes(ws ? raw.simples?.mei : raw.opcao_pelo_mei)
      ? 'MEI'
      : yes(ws ? raw.simples?.simples : raw.opcao_pelo_simples)
        ? 'Simples Nacional'
        : '',
  };
}

function describeLookup(failures, c) {
  if (failures.every((x) => x.code === 404)) return 'CNPJ não encontrado nas fontes consultadas.';
  if (failures.some((x) => x.code === 429))
    return 'Limite de consultas atingido. Aguarde antes de tentar novamente.';
  if (/[A-Z]/.test(c) && failures.some((x) => [400, 422].includes(x.code)))
    return 'Uma das fontes ainda não aceita este CNPJ alfanumérico.';
  if (failures.some((x) => x.code === 403)) return 'A fonte bloqueou a consulta.';
  return (
    'Consulta indisponível. ' +
    failures.map((x) => x.name + ' (' + x.reason + ')').join(' · ') +
    '.'
  );
}

async function lookupCnpj(force = false) {
  const form = $('#edit-form');
  if (!form || form.dataset.type !== 'client') return;
  const input = form.elements.document,
    c = cleanDocument(input.value);
  if (!validCnpj(c))
    return lookupStatus(
      'Informe um CNPJ válido de 14 caracteres. CPF é preenchido manualmente.',
      'warn',
    );
  if (!force && c === cnpjFetchedValue) return;
  cancelCnpjLookup();
  const seq = cnpjLookupSeq,
    failures = [];
  const live = () => seq === cnpjLookupSeq && form.isConnected && cleanDocument(input.value) === c;
  const button = $('#lookup-cnpj');
  button.disabled = true;
  button.textContent = 'Consultando…';
  const original = new Map([...registryKeys, 'regime'].map((k) => [k, form.elements[k].value]));
  try {
    for (const source of CNPJ_SOURCES) {
      if (!live()) return;
      lookupStatus('Consultando ' + source.name + '…');
      const controller = new AbortController();
      cnpjController = controller;
      const timer = setTimeout(() => controller.abort(), proxyBase ? 11500 : 8500);
      try {
        const url = proxyBase ? proxyBase + source.path + '/' + c : source.base + c;
        const authHeaders = {
          Accept: 'application/json',
        };
        if (proxyBase) {
          const token = await panelConnection.bridge?.token?.(window);
          if (!token)
            throw Object.assign(Error('Sessão expirada.'), {
              code: 401,
            });
          authHeaders.Authorization = 'Bearer ' + token;
        }
        const response = await fetch(url, {
          headers: authHeaders,
          signal: controller.signal,
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
        });
        if (!response.ok)
          throw Object.assign(Error('HTTP ' + response.status), {
            code: response.status,
          });
        const raw = await response.json(),
          info = normalizeCnpjResult(raw, source.name, c);
        if (!live()) return;
        for (const key of [...registryKeys, 'regime']) {
          const el = form.elements[key];
          const previous = original.get(key);
          if (!info[key] || el.value !== previous) continue;
          // Contatos, regime e textos informados pelo usuário têm precedência.
          if (
            previous &&
            !(key === 'regime' && previous === 'Outro') &&
            filledRegistry.get(key) !== previous
          )
            continue;
          el.value = info[key];
          filledRegistry.set(key, el.value);
        }
        form.dataset.lookupDoc = c;
        form.elements.cnpjLookupSource.value = source.name;
        const upstreamDate = response.headers.get('X-Clyriva-Consulted-At');
        form.elements.cnpjLookupAt.value =
          upstreamDate && !isNaN(Date.parse(upstreamDate))
            ? upstreamDate
            : new Date().toISOString();
        input.value = fmtCnpj(c);
        cnpjFetchedValue = c;
        form.querySelector('#cnpj-extra').open = true;
        form.querySelector('.cnpj-source').textContent =
          'Fonte: ' +
          source.name +
          ' · ' +
          new Date(form.elements.cnpjLookupAt.value).toLocaleString('pt-BR');
        const duplicate = panelWorkspace.data.clients.some(
          (x) => x.id !== form.dataset.edit && cleanDocument(x.document) === c,
        );
        lookupStatus(
          'Dados encontrados pela ' +
            source.name +
            '. ' +
            (duplicate ? 'CNPJ já cadastrado.' : 'Revise os campos antes de salvar.'),
          duplicate ? 'warn' : 'good',
        );
        return;
      } catch (e) {
        if (!live()) return;
        if (proxyBase && e.code === 401) {
          lookupStatus(
            'Sua sessão expirou. Entre novamente para consultar o CNPJ. Os campos continuam disponíveis para preenchimento manual.',
            'warn',
          );
          return;
        }
        failures.push({
          name: source.name,
          code: e.code,
          reason:
            e.name === 'AbortError'
              ? 'tempo esgotado'
              : e instanceof TypeError
                ? 'rede ou CORS'
                : e.message,
        });
      } finally {
        clearTimeout(timer);
      }
    }
    if (live())
      lookupStatus(
        describeLookup(failures, c) +
          ' O cadastro manual está disponível.' +
          (!proxyBase
            ? ' Para usar a consulta pelo servidor, inicie o Clyriva pelo arquivo INICIAR-WINDOWS.cmd ou servidor.py.'
            : ''),
        'bad',
      );
  } finally {
    if (live()) {
      cnpjController = null;
      button.disabled = false;
      button.textContent = 'Buscar CNPJ';
    }
  }
}

export { cancelCnpjLookup, documentChanged, filledRegistry, lookupCnpj, registryKeys };
