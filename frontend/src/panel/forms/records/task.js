import { clientOpts, field } from '../fields.js';
import { state } from '../../state/filters.js';
import { id, today } from '../../shared/format.js';
import { toast } from '../../shared/feedback.js';
import { mutate } from '../../state/transactions.js';
import { panelWorkspace } from '../../state/workspace.js';
import { closeModal } from '../dialog.js';
import { openInternalDocs } from '../../documents/dialog.js';
import { publishInternalDoc } from '../../documents/publish.js';

export function describeTask({ item, preset, clientId }) {
  const title = item ? 'Editar tarefa' : 'Nova obrigação / pendência';
  const description = 'Agenda particular por cliente e competência.';
  const fields = [
    field('Cliente', 'clientId', clientId, {
      options: clientOpts(),
      required: true,
      wide: true,
    }),
    field('Título da tarefa', 'title', item?.title || '', {
      wide: true,
      required: true,
      placeholder: 'Ex.: Verificar DAS, receber extratos, emitir NF',
    }),
    field('Categoria', 'category', item?.category || preset.category || 'Fiscal', {
      options: [
        ['Fiscal', 'Fiscal'],
        ['Documental', 'Documental'],
        ['Financeira', 'Financeira'],
        ['Atendimento', 'Atendimento'],
        ['Contábil', 'Contábil'],
        ['Outros', 'Outros'],
      ],
    }),
    field('Competência', 'competence', item?.competence || state.month, {
      type: 'month',
      required: true,
    }),
    field('Data limite', 'dueDate', item?.dueDate || today, {
      type: 'date',
      required: true,
    }),
    field('Prioridade', 'priority', item?.priority || 'medium', {
      options: [
        ['high', 'Alta'],
        ['medium', 'Média'],
        ['low', 'Baixa'],
      ],
    }),
    field('Situação', 'status', item?.status || 'pending', {
      options: [
        ['pending', 'Pendente'],
        ['progress', 'Em andamento'],
        ['done', 'Concluída'],
      ],
    }),
    field('Observações', 'notes', item?.notes || '', {
      area: true,
      wide: true,
    }),
  ].join('');
  return {
    title,
    description,
    fields,
  };
}
export async function saveTask({ values, item, form }) {
  if (item && item.clientId !== values.clientId)
    return toast('Não altere a empresa desta tarefa; crie outra para a empresa correta.', true);
  values.awaitingClient = Object.hasOwn(values, 'awaitingClient');
  values.title = values.title.trim();
  if (!values.title) return toast('Informe um título para a tarefa.', true);
  const record = {
    ...values,
    id: item?.id || id(),
  };
  const ok = await mutate(() => {
    if (item) Object.assign(item, record);
    else panelWorkspace.data.tasks.push(record);
  }, 'Tarefa salva.');
  if (ok) {
    const file = form.querySelector('#f-internal-doc')?.files?.[0];
    closeModal();
    if (file) openInternalDocs('task', record.id, file);
    if (item) publishInternalDoc('task', record.id, true);
  }
}
