import { Action, DataTable, EmptyState, InvoiceStatus, Panel } from '../../../components/index.ts';
import { brl, fmtDate, mon } from '../../../lib/format.ts';
import { state } from '../../../state/filters.ts';
import type { Client, Invoice } from '../../../../../shared/domain/types.ts';

interface Props {
  client: Client;
  invoices: Invoice[];
}

export function ClientInvoicesPanel({ client, invoices }: Props) {
  return (
    <Panel
      title="Notas fiscais"
      subtitle={`Competência ${mon(state.month)}`}
      actions={
        <Action action="new-invoice-for" recordId={client.id}>
          Nova NF
        </Action>
      }
    >
      {invoices.length ? (
        <DataTable columns={['NF', 'Emissão', 'Valor', 'Situação']}>
          {invoices.map((x) => (
            <tr key={x.id}>
              <td>
                <strong>{x.number || 'Sem número'}</strong>
                <small>{x.description || ''}</small>
              </td>
              <td>{fmtDate(x.date)}</td>
              <td className="money">{brl(x.value)}</td>
              <td>
                <InvoiceStatus status={x.status} />
              </td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState icon="▧" title="Sem NFs" description="Nenhuma nota cadastrada no período." />
      )}
    </Panel>
  );
}
