import { id, ymOffset } from '../lib/format.ts';
import { state } from '../state/filters.ts';
import { panelWorkspace } from '../state/workspace.ts';
import { scope } from '../state/selectors.ts';
import { toast } from '../lib/feedback.ts';
import { mutate } from '../state/transactions.ts';

function copyTasks(): void {
  const prev = ymOffset(state.month, -1);
  const from = panelWorkspace.data.tasks.filter((t) => t.competence === prev && scope(t));
  if (!from.length) return toast('Nenhuma tarefa no mês anterior para copiar.', true);
  const copies = from
    .filter(
      (t) =>
        !panelWorkspace.data.tasks.some(
          (x) =>
            x.clientId === t.clientId &&
            x.competence === state.month &&
            x.title === t.title &&
            x.category === t.category,
        ),
    )
    .map((t) => {
      const desired = Number(t.dueDate?.slice(8, 10)) || 10;
      const [y, m] = state.month.split('-').map(Number);
      const day = Math.min(desired, new Date(y, m, 0).getDate());
      return {
        ...t,
        id: id(),
        competence: state.month,
        dueDate: `${state.month}-${String(day).padStart(2, '0')}`,
        status: 'pending' as const,
      };
    });
  if (!copies.length)
    return toast('As tarefas do mês anterior já existem nesta competência.', true);
  mutate(
    () => panelWorkspace.data.tasks.push(...copies),
    `${copies.length} tarefa(s) copiada(s). Confira os vencimentos.`,
  );
}

export { copyTasks };
