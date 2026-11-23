import { Action, EmptyState, Panel, TaskStatus } from '../../../components/index.ts';
import { fmtDate } from '../../../lib/format.ts';
import type { Client, Task } from '../../../../../shared/domain/types.ts';

interface Props {
  client: Client;
  tasks: Task[];
}

export function ClientTasksPanel({ client, tasks }: Props) {
  return (
    <Panel
      title="Obrigações e pendências"
      subtitle={`${tasks.length} tarefa(s) cadastrada(s)`}
      actions={
        <Action action="new-task-for" recordId={client.id}>
          Criar tarefa
        </Action>
      }
    >
      {tasks.length ? (
        <div className="mini-list">
          {tasks.map((x) => (
            <div key={x.id} className="mini-row">
              <div>
                <strong>{x.title}</strong>
                <small>{fmtDate(x.dueDate)}</small>
              </div>
              <TaskStatus status={x.status} />
              <Action action="docs-task" recordId={x.id} variant="small">
                Anexos
              </Action>
              <Action action="publish-task" recordId={x.id} variant="small">
                Enviar ao app
              </Action>
              {x.status !== 'done' ? (
                <Action action="complete-task" recordId={x.id}>
                  Concluir
                </Action>
              ) : (
                ''
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="☑"
          title="Nenhuma tarefa"
          description="Não há pendências lançadas no período."
        />
      )}
    </Panel>
  );
}
