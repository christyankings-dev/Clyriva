import {
  cash,
  clients,
  feeExpected,
  feePaid,
  invoices,
  issued,
  openInvoice,
  sum,
  tasks,
} from '../state/selectors.js';
import { state } from '../state/filters.js';

function totals() {
  const inv = invoices().filter(issued),
    faturamento = sum(inv, (x) => x.value),
    rc = cash().filter((x) => x.kind === 'receipt'),
    cp = cash().filter((x) => x.kind === 'expense'),
    open = sum(inv, openInvoice),
    pending = tasks().filter((t) => t.status !== 'done');
  const expected = sum(clients(), (c) => feeExpected(c.id, state.month));
  const paid = sum(clients(), (c) => feePaid(c.id, state.month));
  return {
    invs: inv,
    faturamento,
    rc,
    cp,
    received: sum(rc, (x) => x.value),
    spent: sum(cp, (x) => x.value),
    open,
    pending,
    expected,
    paid,
  };
}

export { totals };
