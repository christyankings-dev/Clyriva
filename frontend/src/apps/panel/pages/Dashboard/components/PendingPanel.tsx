import { Badge, EmptyState, Panel, TaskStatus } from '../../../components/index.ts';
import { fmtDate, mon, today } from '../../../lib/format.ts';
import { state } from '../../../state/filters.ts';
import { clientName } from '../../../state/selectors.ts';
import type { Task } from '../../../../../shared/domain/types.ts';

interface Props {
  /** Pendências ordenadas por vencimento (já limitadas). */
  shown: Task[];
  /** Total de atividades abertas no mês. */
  total: number;
}

export function PendingPanel({ shown, total }: Props) {
  return (
    <Panel
      title="Próximas pendências"
      subtitle={`${total} atividades abertas em ${mon(state.month)}`}
      actions={
        <button data-action="go-tasks" className="btn plain">
          Ver tarefas ↗
        </button>
      }
    >
      {shown.length ? (
        <div className="mini-list">
          {shown.map((x) => (
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
  );
}
