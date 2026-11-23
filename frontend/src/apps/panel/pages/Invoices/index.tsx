import {
  Action,
  DataTable,
  EmptyState,
  InvoiceStatus,
  Metric,
  NewRecord,
  PageHeader,
} from '../../components/index.ts';
import {
  clientName,
  invoices,
  issued,
  matchQuery,
  openInvoice,
  paidToInvoice,
  sum,
} from '../../state/selectors.ts';
import { state } from '../../state/filters.ts';
import { brl, fmtDate, mon } from '../../lib/format.ts';
function Invoices() {
  const list = invoices()
    .filter(
      (x) =>
        matchQuery([x.number, clientName(x.clientId), x.description].join(' ')) &&
        (state.status === 'all' || x.status === state.status),
    )
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const issuedOnly = invoices().filter(issued);
  return (
    <>
      <PageHeader
        eyebrow="DOCUMENTOS FISCAIS"
        title="Notas fiscais"
        description="Controle o que foi emitido, cancelado e o que ainda precisa de emissão."
        actions={<NewRecord entity="invoice">Registrar NF</NewRecord>}
      />
      <div className="kpis">
        <Metric
          title="NFs emitidas"
          value={issuedOnly.length}
          note="No período selecionado"
          icon="▧"
        />
        <Metric
          title="Faturamento fiscal"
          value={brl(sum(issuedOnly, (x) => x.value))}
          note="Somente notas emitidas"
          icon="↗"
        />
        <Metric
          title="A emitir"
          value={invoices().filter((x) => x.status === 'pending').length}
          note="Notas planejadas ou pendentes"
          icon="◷"
        />
        <Metric
          title="Saldo aberto de NFs"
          value={brl(sum(issuedOnly, openInvoice))}
          note="Após recebimentos vinculados"
          icon="◈"
        />
      </div>
      <div className="toolbar">
        <div className="toolbar-group">
          <label className="search">
            <span>⌕</span>
            <input
              id="search"
              placeholder="Buscar nota, cliente..."
              key={state.query}
              defaultValue={state.query}
            />
          </label>
          <select
            key={state.status}
            defaultValue={state.status}
            id="status-filter"
            className="select"
          >
            <option value="all">Todos os status</option>
            <option value="issued">Emitidas</option>
            <option value="pending">A emitir</option>
            <option value="canceled">Canceladas</option>
          </select>
        </div>
      </div>
      <section className="panel">
        {list.length ? (
          <DataTable
            columns={[
              'Cliente / Documento',
              'Emissão / Competência',
              'Valor',
              'Recebido',
              'Em aberto',
              'Situação',
              'Ações',
            ]}
          >
            {list.map((x) => (
              <tr key={x.id}>
                <td>
                  <strong>{clientName(x.clientId)}</strong>
                  <small>
                    NF {x.number || 'Sem número'} · {x.description || 'Sem descrição'}
                  </small>
                </td>
                <td className="nobr">
                  {fmtDate(x.date)}
                  <small>{mon(x.competence)}</small>
                </td>
                <td className="money">{brl(x.value)}</td>
                <td className="money good">{brl(paidToInvoice(x.id))}</td>
                <td className="money">{x.status === 'issued' ? brl(openInvoice(x)) : '—'}</td>
                <td>
                  <InvoiceStatus status={x.status} />
                </td>
                <td>
                  <div className="table-actions">
                    {x.status === 'issued' ? (
                      <Action action="new-receipt-for" recordId={x.id}>
                        Receber
                      </Action>
                    ) : (
                      ''
                    )}
                    <Action action="edit-invoice" recordId={x.id}>
                      Editar
                    </Action>
                    <Action action="delete-invoice" recordId={x.id} variant="small danger">
                      Excluir
                    </Action>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState
            icon="▧"
            title="Nenhuma nota nesta competência"
            description="Comece cadastrando uma NF emitida ou prevista."
            actions={<NewRecord entity="invoice">Registrar nota</NewRecord>}
          />
        )}
      </section>
      <p className="caption mt18">
        As notas são registros de controle: o site não emite NFS-e nem consulta automaticamente
        prefeituras ou o sistema nacional.
      </p>
    </>
  );
}
export { Invoices };
