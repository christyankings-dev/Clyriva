import {
  Action,
  Badge,
  DataTable,
  EmptyState,
  Metric,
  NewRecord,
  PageHeader,
} from '../components/PanelComponents.jsx';
import { clientName, matchQuery, sum, taxes } from '../state/selectors.js';
import { state } from '../state/filters.js';
import { brl, fmtDate, mon, today } from '../shared/format.js';
function Taxes() {
  const list = taxes()
    .filter(
      (x) =>
        matchQuery([x.kind, x.ref, clientName(x.clientId), x.notes].join(' ')) &&
        (state.status === 'all' || x.status === state.status),
    )
    .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
  const due = taxes().filter((x) => x.status !== 'paid');
  return (
    <>
      <PageHeader
        eyebrow="TRIBUTOS E OBRIGAÇÕES"
        title="Guias e tributos"
        description="Acompanhe valores, vencimentos e pagamentos registrados manualmente."
        actions={<NewRecord entity="tax">Cadastrar guia</NewRecord>}
      />
      <section className="kpis">
        <Metric title="Guias lançadas" value={taxes().length} note="Nesta competência" icon="▣" />
        <Metric
          title="Valor total"
          value={brl(sum(taxes(), (x) => x.value))}
          note="Guias registradas"
          icon="▤"
        />
        <Metric
          title="Valor pago"
          value={brl(
            sum(
              taxes().filter((x) => x.status === 'paid'),
              (x) => x.value,
            ),
          )}
          note="Pagamentos confirmados manualmente"
          icon="✓"
        />
        <Metric
          title="Em aberto"
          value={brl(sum(due, (x) => x.value))}
          note={`${due.filter((x) => x.dueDate < today).length} guia(s) vencida(s)`}
          icon="◷"
        />
      </section>
      <div className="notice blue">
        Registre os valores e vencimentos da guia oficial. Este módulo{' '}
        <strong>
          não calcula tributos, não gera DAS ou DARF e não verifica pagamentos automaticamente
        </strong>
        .
      </div>
      <div className="toolbar">
        <div className="toolbar-group">
          <label className="search">
            <span>⌕</span>
            <input
              id="search"
              placeholder="Buscar guia ou cliente..."
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
            <option value="open">Em aberto</option>
            <option value="paid">Pago</option>
          </select>
        </div>
      </div>
      <section className="panel">
        {list.length ? (
          <DataTable
            columns={[
              'Cliente',
              'Tipo / referência',
              'Competência',
              'Vencimento',
              'Valor',
              'Situação',
              'Ações',
            ]}
          >
            {list.map((x) => (
              <tr key={x.id}>
                <td>
                  <strong>{clientName(x.clientId)}</strong>
                </td>
                <td>
                  <strong>{x.kind}</strong>
                  <small>{x.ref || x.notes || 'Sem referência'}</small>
                </td>
                <td>{mon(x.competence)}</td>
                <td>
                  {fmtDate(x.dueDate)}
                  {x.status !== 'paid' && x.dueDate < today ? (
                    <small className="tw:text-[#bd4d58]">Vencida</small>
                  ) : (
                    ''
                  )}
                </td>
                <td className="money">{brl(x.value)}</td>
                <td>
                  {x.status === 'paid' ? (
                    <Badge tone="good">Pago</Badge>
                  ) : (
                    <Badge tone="warn">Em aberto</Badge>
                  )}
                  {x.paidAt ? <small>{fmtDate(x.paidAt)}</small> : ''}
                </td>
                <td>
                  <div className="table-actions">
                    {x.status !== 'paid' ? (
                      <Action action="pay-tax" recordId={x.id}>
                        Registrar pagamento
                      </Action>
                    ) : (
                      ''
                    )}
                    <Action action="docs-tax" recordId={x.id}>
                      📎 Anexos
                    </Action>
                    <Action action="publish-tax" recordId={x.id}>
                      Enviar ao app
                    </Action>
                    <Action action="edit-tax" recordId={x.id}>
                      Editar
                    </Action>
                    <Action action="delete-tax" recordId={x.id} variant="small danger">
                      Excluir
                    </Action>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState
            icon="▣"
            title="Nenhuma guia cadastrada"
            description="Registre DAS, DARF, ISS e outros tributos conforme as guias emitidas."
            actions={<NewRecord entity="tax">Cadastrar guia</NewRecord>}
          />
        )}
      </section>
    </>
  );
}
export { Taxes };
