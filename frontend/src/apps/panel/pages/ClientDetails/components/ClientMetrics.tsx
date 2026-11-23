import { Metric } from '../../../components/index.ts';
import { brl } from '../../../lib/format.ts';
import { feeExpected, feePaid, issued, sum } from '../../../state/selectors.ts';
import { state } from '../../../state/filters.ts';
import type { Client } from '../../../../../shared/domain/types.ts';
import type { ClientMonth } from '../types.ts';

interface Props {
  client: Client;
  month: ClientMonth;
}

export function ClientMetrics({ client, month }: Props) {
  const invoices = month.invoices;
  const mov = month.cash;
  const billed = sum(invoices.filter(issued), (x) => x.value),
    received = sum(
      mov.filter((x) => x.kind === 'receipt'),
      (x) => x.value,
    ),
    expenses = sum(
      mov.filter((x) => x.kind === 'expense'),
      (x) => x.value,
    );
  return (
    <section className="kpis">
      <Metric
        title="NFs emitidas"
        value={brl(billed)}
        note={`${invoices.filter(issued).length} documento(s) no mês`}
        icon="▧"
      />
      <Metric title="Recebimentos" value={brl(received)} note="Caixa do mês" icon="↙" />
      <Metric title="Despesas" value={brl(expenses)} note="Saídas financeiras do mês" icon="↗" />
      <Metric
        title="Honorários pagos"
        value={brl(feePaid(client.id, state.month))}
        note={`de ${brl(feeExpected(client.id, state.month))} previstos`}
        icon="◈"
      />
    </section>
  );
}
