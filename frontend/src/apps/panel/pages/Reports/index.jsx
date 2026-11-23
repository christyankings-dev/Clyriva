import {
  Action,
  Badge,
  DataTable,
  EmptyState,
  PageHeader,
} from '../../components/PanelComponents.jsx';
import { totals } from '../../billing/totals.js';
import { reportRows } from '../../reports/rows.js';
import { brl, mon } from '../../lib/format.js';
import { state } from '../../state/filters.js';
function Reports() {
  const t = totals(),
    byClients = reportRows();
  return (
    <>
      <PageHeader
        eyebrow="INTELIGÊNCIA DA CARTEIRA"
        title="Relatórios por cliente"
        description="Compare o faturamento fiscal, entradas, despesas, honorários e pendências."
        actions={
          <button data-action="export-csv" className="btn">
            ↧ Exportar relatório CSV
          </button>
        }
      />
      <div className="report-grid">
        <div className="report-item">
          <span>Faturamento fiscal consolidado</span>
          <strong>{brl(t.faturamento)}</strong>
          <small>Notas emitidas na competência</small>
        </div>
        <div className="report-item">
          <span>Recebimentos consolidados</span>
          <strong>{brl(t.received)}</strong>
          <small>Entradas lançadas no mês</small>
        </div>
        <div className="report-item">
          <span>Receita do meu escritório</span>
          <strong>{brl(t.paid)}</strong>
          <small>Honorários efetivamente registrados como pagos</small>
        </div>
      </div>
      <div className="toolbar">
        <label className="search">
          <span>⌕</span>
          <input
            id="search"
            placeholder="Buscar cliente no relatório..."
            key={state.query}
            defaultValue={state.query}
          />
        </label>
        <span className="caption">
          Competência {mon(state.month)} · {byClients.length} cliente(s)
        </span>
      </div>
      <section className="panel">
        {byClients.length ? (
          <DataTable
            columns={[
              'Cliente',
              'NFs',
              'Faturamento',
              'Entradas',
              'Despesas',
              'NFs em aberto',
              'Honorários recebidos',
              'Tributos em aberto',
              'Pendências',
            ]}
          >
            {byClients.map((x) => (
              <tr key={x.c.id}>
                <td>
                  <strong>{x.c.name}</strong>
                  <small>{x.c.regime || 'Não informado'}</small>
                  <Action action="resumo-cliente" recordId={x.c.id}>
                    Resumo do mês
                  </Action>
                </td>
                <td>{x.issued}</td>
                <td className="money">{brl(x.billed)}</td>
                <td className="money good">{brl(x.received)}</td>
                <td className="money bad">{brl(x.expenses)}</td>
                <td className="money">{brl(x.open)}</td>
                <td className="money">
                  {brl(x.paid)} <small>de {brl(x.fee)}</small>
                </td>
                <td className="money">{brl(x.taxOpen)}</td>
                <td>
                  {x.tasks ? (
                    <Badge tone="warn">{`${x.tasks} em aberto`}</Badge>
                  ) : (
                    <Badge tone="good">Em dia</Badge>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState
            icon="▥"
            title="Sem dados para este filtro"
            description="Cadastre clientes e informações do mês para gerar o relatório."
          />
        )}
      </section>
      <div className="notice blue mt18">
        <strong>Importante:</strong> estes indicadores são gerenciais e dependem dos lançamentos
        feitos por você. Não equivalem, por si só, à escrituração contábil oficial, apuração
        tributária ou conciliação bancária.
      </div>
    </>
  );
}
export { Reports };
