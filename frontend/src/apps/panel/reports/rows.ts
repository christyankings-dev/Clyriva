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
} from '../state/selectors.ts';
import { state } from '../state/filters.ts';
import { core } from '../state/workspace.ts';
import type { Client } from '../../../shared/domain/types.ts';

// Uma passagem por módulo. Tela e CSV compartilham os mesmos saldos em centavos.
export interface ReportRow {
  c: Client;
  issued: number;
  billed: number;
  received: number;
  expenses: number;
  open: number;
  tasks: number;
  taxOpen: number;
  fee: number;
  paid: number;
}

type MoneyColumn = 'billed' | 'received' | 'expenses' | 'open' | 'taxOpen';

const moneyColumns: MoneyColumn[] = ['billed', 'received', 'expenses', 'open', 'taxOpen'];

function reportRows(): ReportRow[] {
  const rows = new Map<string, ReportRow>(
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
    for (const key of moneyColumns) r[key] /= 100;
  }
  return result.filter(
    (r) => state.page !== 'reports' || matchQuery([r.c.name, r.c.document].join(' ')),
  );
}

export { reportRows };
