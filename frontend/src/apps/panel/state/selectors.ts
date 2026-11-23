import { core, panelWorkspace } from './workspace.ts';
import { state } from './filters.ts';
import { n } from '../lib/format.ts';
import type { Client, Fee, Invoice } from '../../../shared/domain/types.ts';

const clients = () =>
  panelWorkspace.data.clients.filter((c) => state.client === 'all' || c.id === state.client);

const indexState = {
  indexesDirty: true,
};

/** Índices reconstruídos por `rebuildIndexes` (navigation/router.ts). */
const lookupIndexes = {
  clientsById: new Map<string, Client>(),
  linkedReceipts: new Map<string, number>(),
  feeIndex: new Map<string, Fee>(),
};

const client = (id: string | null | undefined): Client | undefined =>
  id == null ? undefined : lookupIndexes.clientsById.get(id);

const clientName = (id: string | null | undefined): string =>
  client(id)?.name || 'Cliente removido';

const scope = (x: { clientId: string }): boolean =>
  state.client === 'all' || x.clientId === state.client;

const sum = core.sum;

const invoices = () =>
  panelWorkspace.data.invoices.filter((x) => scope(x) && x.competence === state.month);

const cash = () =>
  panelWorkspace.data.cash.filter(
    (x) => scope(x) && String(x.date || '').slice(0, 7) === state.month,
  );

const tasks = () =>
  panelWorkspace.data.tasks.filter((x) => scope(x) && x.competence === state.month);

const taxes = () =>
  panelWorkspace.data.taxes.filter((x) => scope(x) && x.competence === state.month);

const feeRecord = (cid: string, m: string): Fee | undefined =>
  lookupIndexes.feeIndex.get(JSON.stringify([cid, m]));

function feeDefault(cid: string, m: string): number {
  const c = client(cid);
  return c?.status === 'active' && (!c.start || c.start.slice(0, 7) <= m) ? n(c.monthlyFee) : 0;
}

const feeExpected = (cid: string, m: string): number =>
  feeRecord(cid, m)?.expected != null ? n(feeRecord(cid, m)?.expected) : feeDefault(cid, m);

const feePaid = (cid: string, m: string): number => n(feeRecord(cid, m)?.paid);

const issued = (x: Invoice): boolean => x.status === 'issued';

const invoiceNet = (x: Invoice): number => n(x.value);

const paidToInvoice = (iid: string): number => (lookupIndexes.linkedReceipts.get(iid) || 0) / 100;

const openInvoice = (x: Invoice): number =>
  Math.max(0, core.cents(invoiceNet(x)) - core.cents(paidToInvoice(x.id))) / 100;

const activeClients = () => clients().filter((c) => c.status === 'active');

const matchQuery = (x: unknown): boolean =>
  !state.query ||
  String(x).toLocaleLowerCase('pt-BR').includes(state.query.toLocaleLowerCase('pt-BR'));

export {
  activeClients,
  cash,
  client,
  clientName,
  clients,
  feeExpected,
  feePaid,
  feeRecord,
  indexState,
  invoices,
  issued,
  lookupIndexes,
  matchQuery,
  openInvoice,
  paidToInvoice,
  scope,
  sum,
  tasks,
  taxes,
};
