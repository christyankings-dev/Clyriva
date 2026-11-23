import type { CashEntry, Fee, VaultBlob, Workspace, WorkspaceGroup } from './types.ts';

const groups: WorkspaceGroup[] = ['clients', 'invoices', 'cash', 'tasks', 'fees', 'taxes'];
const labels: Record<WorkspaceGroup, string> = {
  clients: 'Clientes',
  invoices: 'Notas fiscais',
  cash: 'Caixa',
  tasks: 'Tarefas',
  fees: 'Honorários',
  taxes: 'Guias',
};
const empty = (): Workspace => ({
  version: 1,
  clients: [],
  invoices: [],
  cash: [],
  tasks: [],
  fees: [],
  taxes: [],
});
const cents = (v: unknown): number => {
  const t = String(v ?? 0);
  if (!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(t)) return NaN;
  const [whole, frac = ''] = t.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
};
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const sum = <T>(rows: T[], field: (row: T) => unknown): number =>
  rows.reduce((value, row) => value + cents(field(row)), 0) / 100;
const brl = (v: unknown): string => money.format(Number(v) || 0);
const doc = (v: unknown): string =>
  String(v ?? '')
    .trim()
    .replace(/[./\-\s]/g, '')
    .toUpperCase();
const isCnpj = (v: unknown): boolean => /^[A-Z0-9]{12}[0-9]{2}$/.test(doc(v));
function validCnpj(value: unknown): boolean {
  const c = doc(value);
  if (!isCnpj(c) || /^(.)\1{13}$/.test(c)) return false;
  const digits = Array.from(c, (ch) => ch.charCodeAt(0) - 48);
  for (const size of [12, 13]) {
    const total = digits.slice(0, size).reduce((s, x, i) => s + x * (2 + ((size - 1 - i) % 8)), 0);
    const remainder = total % 11;
    if (digits[size] !== (remainder < 2 ? 0 : 11 - remainder)) return false;
  }
  return true;
}
function validCpf(value: unknown): boolean {
  const c = doc(value);
  if (!/^\d{11}$/.test(c) || /^(.)\1{10}$/.test(c)) return false;
  const digits = [...c].map(Number);
  for (const size of [9, 10]) {
    const total = digits.slice(0, size).reduce((sum, digit, i) => sum + digit * (size + 1 - i), 0);
    const check = (total * 10) % 11;
    if (digits[size] !== (check === 10 ? 0 : check)) return false;
  }
  return true;
}
const validDate = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v + 'T00:00:00Z')) &&
  new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v;
const validMonth = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const dateLabel = (v: unknown): string =>
  validDate(v) ? v.slice(8) + '/' + v.slice(5, 7) + '/' + v.slice(0, 4) : '—';
const monthLabel = (v: unknown): string => (validMonth(v) ? v.slice(5) + '/' + v.slice(0, 4) : '—');
const amounts: Record<WorkspaceGroup, string[]> = {
  clients: ['monthlyFee'],
  invoices: ['value'],
  cash: ['value'],
  tasks: [],
  fees: ['expected', 'paid'],
  taxes: ['value'],
};
type Row = Record<string, unknown>;

function workspace(raw: unknown): Workspace {
  const input = raw as Row | null;
  if (!input || input.version !== 1) throw Error('Versão do arquivo de dados incompatível.');
  const { cofreCriptografado, exportedAt, localRevision, ...data } = input;
  if (data.taxes === undefined) data.taxes = [];
  for (const group of groups) {
    const rows = data[group];
    if (!Array.isArray(rows)) throw Error('Lista inválida no backup: ' + labels[group] + '.');
    const ids = new Set<string>();
    rows.forEach((row: Row | null, i: number) => {
      const fail: (msg: string) => never = (msg) => {
        throw Error(labels[group] + ', linha ' + (i + 1) + ': ' + msg + '.');
      };
      if (!row || typeof row.id !== 'string' || !row.id.trim() || ids.has(row.id))
        fail('identificador ausente ou duplicado');
      ids.add(row.id as string);
      if (group === 'clients' && (typeof row.name !== 'string' || !row.name.trim()))
        fail('nome ausente');
      for (const key of amounts[group]) {
        const value = row[key];
        if (
          value != null &&
          (!['string', 'number'].includes(typeof value) ||
            !/^[0-9]+(?:\.[0-9]{1,2})?$/.test(String(value)) ||
            !Number.isSafeInteger(cents(value)))
        )
          fail('valor inválido em ' + key);
      }
      for (const key of ['date', 'dueDate', 'paidAt', 'start', 'openingDate']) {
        if (row[key] && !validDate(row[key])) fail('data inválida em ' + key);
      }
      if (row.competence && !validMonth(row.competence)) fail('competência inválida');
    });
  }
  return data as unknown as Workspace;
}
function checkLinks(data: Workspace): void {
  const clients = new Set(data.clients.map((c) => c.id));
  const invoices = new Map(data.invoices.map((i) => [i.id, i]));
  const receipts = new Map<string, number>();
  const fees = new Set<string>();
  for (const group of groups.slice(1)) {
    for (const row of data[group] as { id: string; clientId: string }[]) {
      const fail: (message: string) => never = (message) => {
        throw Error(labels[group] + ' (' + row.id + '): ' + message + '.');
      };
      if (!clients.has(row.clientId)) fail('cliente inexistente');
      if (group === 'fees') {
        const fee = row as Fee;
        const key = JSON.stringify([fee.clientId, fee.competence]);
        if (fees.has(key)) fail('honorários duplicados na competência');
        fees.add(key);
        if (cents(fee.paid) > cents(fee.expected)) fail('recebido maior que o devido');
      }
      if (group === 'cash' && (row as CashEntry).invoiceId) {
        const entry = row as CashEntry;
        const invoice = invoices.get(entry.invoiceId as string);
        if (
          !invoice ||
          invoice.clientId !== entry.clientId ||
          invoice.status !== 'issued' ||
          entry.kind !== 'receipt'
        )
          fail('vínculo de recebimento incompatível com a nota');
        const total = (receipts.get(invoice.id) || 0) + cents(entry.value);
        if (total > cents(invoice.value)) fail('recebimentos superiores ao valor da nota');
        receipts.set(invoice.id, total);
      }
    }
  }
}
function vault(blob: unknown): VaultBlob | null {
  if (blob === null || blob === undefined) return null;
  const encoded = (s: unknown, low: number, high: number): boolean => {
    if (
      typeof s !== 'string' ||
      s.length > Math.ceil(high / 3) * 4 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(s) ||
      s.length % 4
    )
      return false;
    try {
      const n = atob(s).length;
      return n >= low && n <= high;
    } catch {
      return false;
    }
  };
  const candidate = blob as Record<string, unknown>;
  if (
    Object.keys(candidate).some(
      (k) => !['version', 'alg', 'kdf', 'iterations', 'salt', 'iv', 'cipher'].includes(k),
    ) ||
    candidate.version !== 1 ||
    (candidate.alg && candidate.alg !== 'AES-GCM') ||
    (candidate.kdf && candidate.kdf !== 'PBKDF2-SHA256') ||
    !Number.isInteger(candidate.iterations) ||
    (candidate.iterations as number) < 100000 ||
    (candidate.iterations as number) > 2000000 ||
    !encoded(candidate.salt, 16, 16) ||
    !encoded(candidate.iv, 12, 12) ||
    !encoded(candidate.cipher, 16, 16 * 1024 * 1024)
  )
    throw Error('Estrutura do cofre criptografado inválida. O original foi preservado.');
  return candidate as unknown as VaultBlob;
}
export {
  empty,
  cents,
  brl,
  sum,
  doc,
  isCnpj,
  validCnpj,
  validCpf,
  validDate,
  validMonth,
  dateLabel,
  monthLabel,
  workspace,
  checkLinks,
  vault,
};
