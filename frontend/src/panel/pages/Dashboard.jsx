import { OfficeAgenda } from '../components/OfficeAgenda.jsx';
import {
  Action,
  Badge,
  DataTable,
  EmptyState,
  InvoiceStatus,
  Metric,
  NewRecord,
  PageHeader,
  Panel,
  TaskStatus,
} from '../components/PanelComponents.jsx';
import { brl, fmtDate, isoMonth, mon, today, ymOffset } from '../shared/format.js';
import { state } from '../state/filters.js';
import { activeClients, clientName, invoices, issued, scope, sum } from '../state/selectors.js';
import { panelWorkspace } from '../state/workspace.js';
import { totals } from '../billing/totals.js';
import { priorityVal } from '../clients/priority.js';
function chartMonths() {
  const months = Array.from(
    {
      length: 6,
    },
    (_, i) => ymOffset(state.month, i - 5),
  );
  const vals = months.map((m) =>
    sum(
      panelWorkspace.data.invoices.filter((x) => scope(x) && x.competence === m && issued(x)),
      (x) => x.value,
    ),
  );
  const mx = Math.max(1, ...vals);
  return (
    <>
      <div className="chart">
        <div className="chart-grid">
          <span />
          <span />
          <span />
          <span />
        </div>
        {months.map((m, i) => (
          <div key={m} className="chart-col">
            <div
              style={{
                height: Math.max(1, (vals[i] / mx) * 100) + '%',
              }}
              className="chart-bar"
            >
              <span className="bar-tip">{brl(vals[i])}</span>
            </div>
            <label>{isoMonth(m)}</label>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span className="legend-dot" /> Valor das NFs emitidas, por competência
      </div>
    </>
  );
}
function portfolioFocus() {
  const upcomingCutoff = (() => {
    const d = new Date(today + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const filteredTasks = panelWorkspace.data.tasks.filter(scope),
    filteredTaxes = panelWorkspace.data.taxes.filter(scope);
  const late = [
    ...filteredTasks.filter((t) => t.status !== 'done' && t.dueDate < today),
    ...filteredTaxes.filter((t) => t.status !== 'paid' && t.dueDate < today),
  ];
  const soon = [
    ...filteredTasks.filter(
      (t) => t.status !== 'done' && t.dueDate >= today && t.dueDate <= upcomingCutoff,
    ),
    ...filteredTaxes.filter(
      (t) => t.status !== 'paid' && t.dueDate >= today && t.dueDate <= upcomingCutoff,
    ),
  ];
  const service = filteredTasks.filter((t) => t.category === 'Atendimento' && t.status !== 'done');
  return (
    <section aria-label="Prioridades da carteira" className="portfolio-focus">
      <div className="focus-heading">
        <div>
          <h2>O que merece sua atenção</h2>
          <p>Visão de toda a carteira, mesmo fora da competência selecionada.</p>
        </div>
        <button data-action="go-service" className="btn small">
          Abrir atendimentos
        </button>
      </div>
      <div className="focus-metrics">
        <button data-action="go-tasks" className="focus-metric urgent">
          <span className="count">{late.length}</span>
          <span className="meta">
            <strong>Vencimentos atrasados</strong>Guias e tarefas ainda abertas
          </span>
        </button>
        <button data-action="go-tasks" className="focus-metric today">
          <span className="count">{soon.length}</span>
          <span className="meta">
            <strong>Próximos 7 dias</strong>Prazos da carteira inteira
          </span>
        </button>
        <button data-action="go-service" className="focus-metric">
          <span className="count">{service.length}</span>
          <span className="meta">
            <strong>Atendimentos abertos</strong>Pedidos aguardando retorno
          </span>
        </button>
      </div>
      <div className="focus-bottom">
        <p>
          {late.length
            ? 'Priorize os vencimentos em atraso antes de iniciar novas rotinas.'
            : 'Nenhum vencimento atrasado cadastrado. Continue acompanhando as próximas entregas.'}
        </p>
        <button data-action="new-service" className="btn plain">
          + Registrar solicitação
        </button>
      </div>
    </section>
  );
}
function Dashboard() {
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
      {`${
        !panelWorkspace.data.clients.length ? (
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
          ''
        )
      }`}
      {`${panelWorkspace.data.clients.length ? <OfficeAgenda /> : ''}`}
      {portfolioFocus()}
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
          <div className="panel-body">{chartMonths()}</div>
        </Panel>
        <Panel
          title="Próximas pendências"
          subtitle={`${t.pending.length} atividades abertas em ${mon(state.month)}`}
          actions={
            <button data-action="go-tasks" className="btn plain">
              Ver tarefas ↗
            </button>
          }
        >
          {pending.length ? (
            <div className="mini-list">
              {pending.map((x) => (
                <div key={x.id} className="mini-row">
                  <div className="first">
                    <div className="mini-icon">☐</div>
                    <div>
                      <strong title={x.title}>{x.title}</strong>
                      <small>
                        {clientName(x.clientId)} · {fmtDate(x.dueDate)}
                      </small>
                    </div>
                  </div>
                  {x.status !== 'done' && x.dueDate < today ? (
                    <Badge tone="bad">Atrasada</Badge>
                  ) : (
                    <TaskStatus status={x.status} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="✓"
              title="Tudo em dia por aqui"
              description="Nenhuma obrigação pendente cadastrada para o mês."
            />
          )}
        </Panel>
      </div>
      <div className="grid-main">
        <Panel title="Notas fiscais recentes" subtitle="Visão por competência">
          {latest.length ? (
            <DataTable columns={['Cliente / Nota', 'Emissão', 'Valor', 'Situação']}>
              {latest.map((x) => (
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
        <Panel title="Indicadores financeiros" subtitle={`Movimentação em ${mon(state.month)}`}>
          <div className="panel-body">
            <div className="detail-item">
              <span>NFs emitidas</span>
              <strong>{brl(t.faturamento)}</strong>
            </div>
            <div className="detail-item">
              <span>Valor das NFs ainda em aberto*</span>
              <strong>{brl(t.open)}</strong>
            </div>
            <div className="detail-item">
              <span>Entradas registradas</span>
              <strong>{brl(t.received)}</strong>
            </div>
            <div className="detail-item">
              <span>Saídas registradas</span>
              <strong>{brl(t.spent)}</strong>
            </div>
            <div className="detail-item">
              <span>Saldo de caixa do mês</span>
              <strong>{brl(t.received - t.spent)}</strong>
            </div>
            <p className="caption mt18">
              * Valores em aberto consideram todos os recebimentos vinculados a cada NF, mesmo os
              ocorridos em outros meses.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
export { Dashboard };
