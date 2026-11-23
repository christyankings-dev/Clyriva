import * as workspaceRules from '../../../shared/domain/workspace.ts';

const $ = <T extends Element = HTMLElement>(selector: string): T | null =>
  document.querySelector<T>(selector);

/** Busca obrigatória no HTML do painel. */
const must = <T extends Element = HTMLElement>(selector: string): T => {
  const found = document.querySelector<T>(selector);
  if (!found) throw Error('Elemento não encontrado na página: ' + selector);
  return found;
};

const id = (): string =>
  globalThis.crypto?.randomUUID?.() || 'id' + Date.now() + Math.random().toString(36).slice(2);

const localToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const today = localToday();

const currentMonth = today.slice(0, 7);

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

const { brl, doc: cleanDocument, isCnpj, validCnpj, validCpf } = workspaceRules;

const fmtCnpj = (x: unknown): string => {
  const c = cleanDocument(x);
  return isCnpj(c)
    ? `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`
    : String(x ?? '');
};

const yes = (x: unknown): boolean =>
  x === true ||
  ['S', 'SIM', '1', 'TRUE'].includes(
    String(x ?? '')
      .trim()
      .toUpperCase(),
  );

const isoDate = (x: unknown): string => {
  const v = String(x || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [d, m, y] = v.split('/');
    return `${y}-${m}-${d}`;
  }
  return '';
};

const { dateLabel: fmtDate, monthLabel: mon } = workspaceRules;

const ymOffset = (m: string, off: number): string => {
  const [y, mm] = m.split('-').map(Number);
  const d = new Date(y, mm - 1 + off, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const shortMonths = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

const isoMonth = (ym: string): string => shortMonths[Number(ym.slice(5, 7)) - 1] || ym;

export {
  $,
  brl,
  cleanDocument,
  currentMonth,
  fmtCnpj,
  fmtDate,
  id,
  isCnpj,
  isoDate,
  isoMonth,
  localToday,
  mon,
  must,
  n,
  today,
  validCnpj,
  validCpf,
  yes,
  ymOffset,
};
