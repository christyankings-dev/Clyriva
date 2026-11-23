import {
  cash,
  clients,
  feeExpected,
  feePaid,
  invoices,
  issued,
  matchQuery,
  openInvoice,
  tasks,
  taxes,
} from '../state/selectors.js';
import { state } from '../state/filters.js';
import { core } from '../state/workspace.js';

// Uma passagem por módulo. Tela e CSV compartilham os mesmos saldos em centavos.
function reportRows() {
  const rows = new Map(
    clients().map((c) => [
      c.id,
      {
        c,
        issued: 0,
        billed: 0,
        received: 0,
        expenses: 0,
        open: 0,
        tasks: 0,
        taxOpen: 0,
        fee: feeExpected(c.id, state.month),
        paid: feePaid(c.id, state.month),
      },
    ]),
  );
  for (const i of invoices()) {
    const r = rows.get(i.clientId);
    if (!r || !issued(i)) continue;
    r.issued++;
    r.billed += core.cents(i.value);
    r.open += core.cents(openInvoice(i));
  }
  for (const x of cash()) {
    const r = rows.get(x.clientId);
    if (!r) continue;
    if (x.kind === 'receipt') r.received += core.cents(x.value);
    if (x.kind === 'expense') r.expenses += core.cents(x.value);
  }
  for (const x of taxes()) {
    const r = rows.get(x.clientId);
    if (r && x.status !== 'paid') r.taxOpen += core.cents(x.value);
  }
  for (const x of tasks()) {
    const r = rows.get(x.clientId);
    if (r && x.status !== 'done') r.tasks++;
  }
  const result = [...rows.values()];
  for (const r of result) {
    for (const key of ['billed', 'received', 'expenses', 'open', 'taxOpen']) r[key] /= 100;
  }
  return result.filter(
    (r) => state.page !== 'reports' || matchQuery([r.c.name, r.c.document].join(' ')),
  );
}

export { reportRows };
