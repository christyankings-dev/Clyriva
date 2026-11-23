import { OfficeAgenda } from '../../components/OfficeAgenda.tsx';
import { Action, Metric, NewRecord, PageHeader, Panel } from '../../components/index.ts';
import { brl, mon } from '../../lib/format.ts';
import { state } from '../../state/filters.ts';
import { activeClients, invoices } from '../../state/selectors.ts';
import { panelWorkspace } from '../../state/workspace.ts';
import { totals } from '../../billing/totals.ts';
import { priorityVal } from '../../clients/priority.ts';
import { BillingChart } from './components/BillingChart.tsx';
import { FinanceIndicators } from './components/FinanceIndicators.tsx';
import { PendingPanel } from './components/PendingPanel.tsx';
import { PortfolioFocus } from './components/PortfolioFocus.tsx';
import { RecentInvoicesPanel } from './components/RecentInvoicesPanel.tsx';

export function Dashboard() {
  const t = totals(),
    cli = activeClients(),
    latest = invoices()
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, 5),
    pending = t.pending
      .slice()
      .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
      .slice(0, 5);
  return (
    <>
      <PageHeader
        eyebrow="PAINEL DE CONTROLE"
        title="Sua gestão, em perspectiva"
        description="Acompanhe clientes, faturamento fiscal, pagamentos e obrigações em um só lugar."
        actions={
          <>
            <NewRecord entity="client">Novo cliente</NewRecord>
            <NewRecord entity="invoice">Nova nota fiscal</NewRecord>
            {state.client === 'all' ? (
              ''
            ) : (
              <Action action="resumo-cliente" recordId={state.client}>
                Resumo do mês
              </Action>
            )}
          </>
        }
      />
      <section className="kpis">
        <Metric title="Clientes ativos" value={cli.length} note="Na sua carteira atual" icon="♧" />
        <Metric
          title="Faturamento fiscal"
          value={brl(t.faturamento)}
          note={`${t.invs.length} nota(s) emitida(s) em ${mon(state.month)}`}
          icon="▧"
        />
        <Metric
          title="Recebido pelos clientes"
          value={brl(t.received)}
          note="Entradas financeiras lançadas no mês"
          icon="↙"
        />
        <Metric
          title="Meus honorários"
          value={brl(t.paid)}
          note={`de ${brl(t.expected)} previstos`}
          icon="◈"
        />
      </section>
      {panelWorkspace.data.clients.length === 0 ? (
        <div className="summary-strip">
          <div>
            <strong>Comece cadastrando seu primeiro cliente</strong>
            <p>
              Depois registre as notas, recebimentos, despesas e obrigações para formar seus
              indicadores.
            </p>
          </div>
          <NewRecord entity="client">Cadastrar cliente</NewRecord>
        </div>
      ) : (
        <OfficeAgenda />
      )}
      <PortfolioFocus />
      <div className="priority-overview">
        <strong>Carteira prioritária</strong>
        <span>
          {cli.filter((c) => ['critical', 'high'].includes(priorityVal(c.priority))).length}{' '}
          cliente(s) em prioridade crítica ou alta
        </span>
        <button data-action="go-clients" className="btn small">
          Organizar clientes →
        </button>
      </div>
      <div className="grid-main">
        <Panel
          title="Evolução do faturamento"
          subtitle="NFs emitidas nos últimos 6 meses"
          actions={
            <button data-action="go-reports" className="btn plain">
              Ver relatórios ↗
            </button>
          }
        >
          <div className="panel-body">
            <BillingChart />
          </div>
        </Panel>
        <PendingPanel shown={pending} total={t.pending.length} />
      </div>
      <div className="grid-main">
        <RecentInvoicesPanel invoices={latest} />
        <FinanceIndicators totals={t} />
      </div>
    </>
  );
}
