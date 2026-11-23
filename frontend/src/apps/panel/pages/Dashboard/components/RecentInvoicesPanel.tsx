import { DataTable, EmptyState, InvoiceStatus, Panel } from '../../../components/index.ts';
import { brl, fmtDate } from '../../../lib/format.ts';
import { clientName } from '../../../state/selectors.ts';
import type { Invoice } from '../../../../../shared/domain/types.ts';

export function RecentInvoicesPanel({ invoices }: { invoices: Invoice[] }) {
  return (
    <Panel title="Notas fiscais recentes" subtitle="Visão por competência">
      {invoices.length ? (
        <DataTable columns={['Cliente / Nota', 'Emissão', 'Valor', 'Situação']}>
          {invoices.map((x) => (
            <tr key={x.id}>
              <td>
                <strong>{clientName(x.clientId)}</strong>
                <small>NF {x.number || 'Sem número'}</small>
              </td>
              <td className="nobr">{fmtDate(x.date)}</td>
              <td className="money">{brl(x.value)}</td>
              <td>
                <InvoiceStatus status={x.status} />
              </td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState
          icon="▧"
          title="Nenhuma NF cadastrada"
          description="Registre uma nota fiscal para acompanhar o faturamento."
        />
      )}
    </Panel>
  );
}
