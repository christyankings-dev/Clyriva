import { cleanDocument, isoDate, yes } from '../../lib/format.ts';

export const registryKeys = [
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
] as const;

export type RegistryKey = (typeof registryKeys)[number] | 'regime';

/** Campos do cadastro preenchidos a partir da consulta. */
export type RegistryInfo = Record<RegistryKey, string>;

export type CnpjSourceName = 'BrasilAPI' | 'CNPJ.ws';

export interface LookupFailure {
  name: string;
  code?: number;
  reason: string;
}

/** Lê um caminho de uma resposta JSON externa, sem presumir sua forma. */
function pick(value: unknown, ...path: string[]): unknown {
  let current = value;
  for (const key of path) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

const text = (v: unknown): string =>
  typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '';

/** Converte a resposta da BrasilAPI ou do CNPJ.ws no formato do cadastro. */
export function normalizeCnpjResult(
  raw: unknown,
  source: CnpjSourceName,
  requested: string,
): RegistryInfo {
  const ws = source === 'CNPJ.ws';
  const est: unknown = ws ? pick(raw, 'estabelecimento') : raw;
  const legalName = pick(raw, 'razao_social');
  if (
    !est ||
    cleanDocument(pick(est, 'cnpj')) !== requested ||
    typeof legalName !== 'string' ||
    !legalName.trim()
  )
    throw Error('Resposta sem identificação correspondente ao CNPJ consultado.');
  const email = text(pick(est, 'email'));
  const address = [
    pick(est, 'descricao_tipo_de_logradouro') || pick(est, 'tipo_logradouro'),
    pick(est, 'logradouro'),
    pick(est, 'numero'),
    pick(est, 'complemento'),
    pick(est, 'bairro'),
  ]
    .map(text)
    .filter(Boolean)
    .join(', ');
  return {
    name: legalName.trim(),
    tradeName: text(pick(est, 'nome_fantasia')),
    segment: text(
      ws ? pick(est, 'atividade_principal', 'descricao') : pick(raw, 'cnae_fiscal_descricao'),
    ),
    activityCode: text(ws ? pick(est, 'atividade_principal', 'id') : pick(raw, 'cnae_fiscal')),
    registryStatus: text(
      ws ? pick(est, 'situacao_cadastral') : pick(raw, 'descricao_situacao_cadastral'),
    ),
    legalNature: text(
      ws ? pick(raw, 'natureza_juridica', 'descricao') : pick(raw, 'natureza_juridica'),
    ),
    companySize: text(
      ws ? pick(raw, 'porte', 'descricao') : pick(raw, 'porte') || pick(raw, 'descricao_porte'),
    ),
    openingDate: isoDate(pick(est, 'data_inicio_atividade')),
    zipCode: text(pick(est, 'cep')).replace(/\D/g, ''),
    address,
    city: text(ws ? pick(est, 'cidade', 'nome') : pick(raw, 'municipio')),
    uf: text(ws ? pick(est, 'estado', 'sigla') : pick(raw, 'uf')),
    phone: ws
      ? [pick(est, 'ddd1'), pick(est, 'telefone1')].map(text).filter(Boolean).join(' ')
      : text(pick(raw, 'ddd_telefone1')),
    email: /^[^\s@;]+@[^\s@;]+\.[^\s@;]+$/.test(email) ? email : '',
    regime: yes(ws ? pick(raw, 'simples', 'mei') : pick(raw, 'opcao_pelo_mei'))
      ? 'MEI'
      : yes(ws ? pick(raw, 'simples', 'simples') : pick(raw, 'opcao_pelo_simples'))
        ? 'Simples Nacional'
        : '',
  };
}

/** Mensagem única que resume por que todas as fontes falharam. */
export function describeLookup(failures: LookupFailure[], c: string): string {
  if (failures.every((x) => x.code === 404)) return 'CNPJ não encontrado nas fontes consultadas.';
  if (failures.some((x) => x.code === 429))
    return 'Limite de consultas atingido. Aguarde antes de tentar novamente.';
  if (/[A-Z]/.test(c) && failures.some((x) => x.code !== undefined && [400, 422].includes(x.code)))
    return 'Uma das fontes ainda não aceita este CNPJ alfanumérico.';
  if (failures.some((x) => x.code === 403)) return 'A fonte bloqueou a consulta.';
  return (
    'Consulta indisponível. ' +
    failures.map((x) => x.name + ' (' + x.reason + ')').join(' · ') +
    '.'
  );
}
