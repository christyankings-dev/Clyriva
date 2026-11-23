import { core, panelWorkspace } from './workspace.js';
import { state } from './filters.js';
import { n } from '../shared/format.js';

const clients = () =>
  panelWorkspace.data.clients.filter((c) => state.client === 'all' || c.id === state.client);

const indexState = {
  indexesDirty: true,
};

const lookupIndexes = {
  clientsById: new Map(),
  linkedReceipts: new Map(),
  feeIndex: new Map(),
};

const client = (id) => lookupIndexes.clientsById.get(id);

const clientName = (id) => client(id)?.name || 'Cliente removido';

const scope = (x) => state.client === 'all' || x.clientId === state.client;

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

const feeRecord = (cid, m) => lookupIndexes.feeIndex.get(JSON.stringify([cid, m]));

const feeExpected = (cid, m) =>
  feeRecord(cid, m)?.expected ??
  (client(cid)?.status === 'active' && (!client(cid)?.start || client(cid).start.slice(0, 7) <= m)
    ? n(client(cid)?.monthlyFee)
    : 0);

const feePaid = (cid, m) => n(feeRecord(cid, m)?.paid);

const issued = (x) => x.status === 'issued';

const invoiceNet = (x) => n(x.value);

const paidToInvoice = (iid) => (lookupIndexes.linkedReceipts.get(iid) || 0) / 100;

const openInvoice = (x) =>
  Math.max(0, core.cents(invoiceNet(x)) - core.cents(paidToInvoice(x.id))) / 100;

const activeClients = () => clients().filter((c) => c.status === 'active');

const matchQuery = (x) =>
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
