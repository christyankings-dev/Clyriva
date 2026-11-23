import {
  Action,
  Badge,
  DataTable,
  EmptyState,
  Metric,
  NewRecord,
  PageHeader,
} from '../components/PanelComponents.jsx';
import {
  cash,
  clientName,
  invoices,
  issued,
  matchQuery,
  openInvoice,
  sum,
} from '../state/selectors.js';
import { state } from '../state/filters.js';
import { brl, fmtDate } from '../shared/format.js';
import { panelWorkspace } from '../state/workspace.js';
function Cash() {
  const list = cash()
    .filter(
      (x) =>
        matchQuery([clientName(x.clientId), x.category, x.notes].join(' ')) &&
        (state.status === 'all' || x.kind === state.status),
    )
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const entries = cash().filter((x) => x.kind === 'receipt'),
    exits = cash().filter((x) => x.kind === 'expense');
  return (
    <>
      <PageHeader
        eyebrow="FLUXO DE CAIXA"
        title="Financeiro dos clientes"
        description="Entradas e saídas informadas por cliente, independentemente de quando a nota foi emitida."
        actions={<NewRecord entity="cash">Registrar movimentação</NewRecord>}
      />
      <section className="kpis">
        <Metric
          title="Recebimentos"
          value={brl(sum(entries, (x) => x.value))}
          note={`${entries.length} entrada(s) no mês`}
          icon="↙"
        />
        <Metric
          title="Despesas"
          value={brl(sum(exits, (x) => x.value))}
          note={`${exits.length} saída(s) no mês`}
          icon="↗"
        />
        <Metric
          title="Saldo de caixa"
          value={brl(sum(entries, (x) => x.value) - sum(exits, (x) => x.value))}
          note="Entradas menos saídas"
          icon="▤"
        />
        <Metric
          title="NFs com saldo em aberto"
          value={invoices().filter((x) => issued(x) && openInvoice(x) > 0.005).length}
          note="Notas da competência selecionada"
          icon="◷"
        />
      </section>
      <div className="toolbar">
        <div className="toolbar-group">
          <label className="search">
            <span>⌕</span>
            <input
              id="search"
              placeholder="Buscar movimentações..."
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
            <option value="all">Entradas e saídas</option>
            <option value="receipt">Recebimentos</option>
            <option value="expense">Despesas</option>
          </select>
        </div>
      </div>
      <section className="panel">
        {list.length ? (
          <DataTable
            columns={['Data', 'Cliente', 'Descrição', 'Nota vinculada', 'Tipo', 'Valor', 'Ações']}
          >
            {list.map((x) => {
              const inv = panelWorkspace.data.invoices.find((i) => i.id === x.invoiceId);
              return (
                <tr key={x.id}>
                  <td className="nobr">{fmtDate(x.date)}</td>
                  <td>
                    <strong>{clientName(x.clientId)}</strong>
                  </td>
                  <td>
                    {x.category || 'Não informada'}
                    <small>{x.notes || ''}</small>
                  </td>
                  <td>{inv ? `NF ${inv.number || 's/n'}` : '—'}</td>
                  <td>
                    {x.kind === 'receipt' ? (
                      <Badge tone="good">Entrada</Badge>
                    ) : (
                      <Badge tone="bad">Saída</Badge>
                    )}
                  </td>
                  <td className={'money ' + x.kind === 'receipt' ? 'good' : 'bad'}>
                    {x.kind === 'receipt' ? '+' : '−'} {brl(x.value)}
                  </td>
                  <td>
                    <div className="table-actions">
                      <Action action="edit-cash" recordId={x.id}>
                        Editar
                      </Action>
                      <Action action="delete-cash" recordId={x.id} variant="small danger">
                        Excluir
                      </Action>
                    </div>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        ) : (
          <EmptyState
            icon="⇄"
            title="Sem lançamentos no mês"
            description="Registre recebimentos e despesas para acompanhar o caixa."
            actions={<NewRecord entity="cash">Novo lançamento</NewRecord>}
          />
        )}
      </section>
      <p className="caption mt18">
        Faturamento (NF emitida) e recebimento (dinheiro recebido) são indicadores diferentes. O
        lançamento financeiro não altera o valor faturado e não duplica a NF.
      </p>
    </>
  );
}
export { Cash };
