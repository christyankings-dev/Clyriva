import { $, cleanDocument, fmtCnpj, isCnpj, validCnpj, validCpf } from '../../lib/format.ts';
import { errorInfo, httpError } from '../../../../shared/lib/errors.ts';
import { panelConnection, panelWorkspace } from '../../state/workspace.ts';
import {
  describeLookup,
  normalizeCnpjResult,
  registryKeys,
  type CnpjSourceName,
  type LookupFailure,
  type RegistryKey,
} from './normalize.ts';

type RegistryField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

let cnpjLookupTimer: ReturnType<typeof setTimeout> | undefined,
  cnpjController: AbortController | null = null,
  cnpjLookupSeq = 0,
  cnpjFetchedValue = '';

const filledRegistry = new Map<string, string>();

const formField = (form: HTMLFormElement, name: string): RegistryField => {
  const el = form.elements.namedItem(name);
  if (!el) throw Error('Campo não encontrado no formulário: ' + name);
  return el as RegistryField;
};

const proxyBase = document.querySelector<HTMLMetaElement>(
  'meta[name="clyriva-cnpj-proxy"]',
)?.content;

const CNPJ_SOURCES: { name: CnpjSourceName; path: string; base: string }[] = [
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

function cancelCnpjLookup(): void {
  clearTimeout(cnpjLookupTimer);
  cnpjController?.abort();
  cnpjController = null;
  cnpjLookupSeq++;
  const button = $<HTMLButtonElement>('#lookup-cnpj');
  if (button) {
    button.disabled = false;
    button.textContent = 'Buscar CNPJ';
  }
  cnpjFetchedValue = '';
}

function lookupStatus(text: string, kind = 'info'): void {
  const target = $('#cnpj-lookup-status');
  if (target) {
    target.textContent = text;
    target.dataset.kind = kind;
  }
}

function documentChanged(input: HTMLInputElement): void {
  const c = cleanDocument(input.value),
    form = input.form;
  if (!form) return;
  cancelCnpjLookup();
  if (form.dataset.lookupDoc !== c) {
    for (const [key, previous] of filledRegistry) {
      const el = form.elements.namedItem(key) as RegistryField | null;
      if (el && el.value === previous) el.value = key === 'regime' ? 'Outro' : '';
    }
    filledRegistry.clear();
    formField(form, 'cnpjLookupAt').value = '';
    formField(form, 'cnpjLookupSource').value = '';
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

async function lookupCnpj(force = false): Promise<void> {
  const form = $<HTMLFormElement>('#edit-form');
  if (!form || form.dataset.type !== 'client') return;
  const input = formField(form, 'document'),
    c = cleanDocument(input.value);
  if (!validCnpj(c))
    return lookupStatus(
      'Informe um CNPJ válido de 14 caracteres. CPF é preenchido manualmente.',
      'warn',
    );
  if (!force && c === cnpjFetchedValue) return;
  cancelCnpjLookup();
  const seq = cnpjLookupSeq,
    failures: LookupFailure[] = [];
  const live = () => seq === cnpjLookupSeq && form.isConnected && cleanDocument(input.value) === c;
  const button = $<HTMLButtonElement>('#lookup-cnpj');
  if (!button) return;
  button.disabled = true;
  button.textContent = 'Consultando…';
  const keys: RegistryKey[] = [...registryKeys, 'regime'];
  const original = new Map(keys.map((k) => [k, formField(form, k).value]));
  try {
    for (const source of CNPJ_SOURCES) {
      if (!live()) return;
      lookupStatus('Consultando ' + source.name + '…');
      const controller = new AbortController();
      cnpjController = controller;
      const timer = setTimeout(() => controller.abort(), proxyBase ? 11500 : 8500);
      try {
        const url = proxyBase ? proxyBase + source.path + '/' + c : source.base + c;
        const authHeaders: Record<string, string> = {
          Accept: 'application/json',
        };
        if (proxyBase) {
          const token = await panelConnection.bridge?.token?.(window);
          if (!token) throw httpError('Sessão expirada.', 401);
          authHeaders.Authorization = 'Bearer ' + token;
        }
        const response = await fetch(url, {
          headers: authHeaders,
          signal: controller.signal,
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
        });
        if (!response.ok) throw httpError('HTTP ' + response.status, response.status);
        const raw: unknown = await response.json(),
          info = normalizeCnpjResult(raw, source.name, c);
        if (!live()) return;
        for (const key of keys) {
          const el = formField(form, key);
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
        formField(form, 'cnpjLookupSource').value = source.name;
        const upstreamDate = response.headers.get('X-Clyriva-Consulted-At');
        formField(form, 'cnpjLookupAt').value =
          upstreamDate && !isNaN(Date.parse(upstreamDate))
            ? upstreamDate
            : new Date().toISOString();
        input.value = fmtCnpj(c);
        cnpjFetchedValue = c;
        const extra = form.querySelector<HTMLDetailsElement>('#cnpj-extra');
        if (extra) extra.open = true;
        const sourceNote = form.querySelector('.cnpj-source');
        if (sourceNote)
          sourceNote.textContent =
            'Fonte: ' +
            source.name +
            ' · ' +
            new Date(formField(form, 'cnpjLookupAt').value).toLocaleString('pt-BR');
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
        const failure = errorInfo(e);
        if (proxyBase && failure.status === 401) {
          lookupStatus(
            'Sua sessão expirou. Entre novamente para consultar o CNPJ. Os campos continuam disponíveis para preenchimento manual.',
            'warn',
          );
          return;
        }
        failures.push({
          name: source.name,
          code: failure.status,
          reason:
            e instanceof DOMException && e.name === 'AbortError'
              ? 'tempo esgotado'
              : e instanceof TypeError
                ? 'rede ou CORS'
                : failure.message,
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

export { cancelCnpjLookup, documentChanged, filledRegistry, lookupCnpj };
