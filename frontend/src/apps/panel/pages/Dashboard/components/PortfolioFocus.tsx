import { today } from '../../../lib/format.ts';
import { scope } from '../../../state/selectors.ts';
import { panelWorkspace } from '../../../state/workspace.ts';

/** Atrasos, próximos prazos e atendimentos abertos de toda a carteira. */
export function PortfolioFocus() {
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
