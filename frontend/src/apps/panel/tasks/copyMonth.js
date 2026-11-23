import { id, ymOffset } from '../lib/format.js';
import { state } from '../state/filters.js';
import { panelWorkspace } from '../state/workspace.js';
import { scope } from '../state/selectors.js';
import { toast } from '../lib/feedback.js';
import { mutate } from '../state/transactions.js';

function copyTasks() {
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
        status: 'pending',
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
