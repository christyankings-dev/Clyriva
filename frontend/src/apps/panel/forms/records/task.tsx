import { state } from '../../state/filters.ts';
import { id, today } from '../../lib/format.ts';
import { toast } from '../../lib/feedback.ts';
import { mutate } from '../../state/transactions.ts';
import { panelWorkspace } from '../../state/workspace.ts';
import { closeModal } from '../dialog.tsx';
import { openInternalDocs } from '../../documents/openDocs.ts';
import { publishInternalDoc } from '../../documents/publish.ts';
import { clientOpts, Field } from '../fields.tsx';
import { asRecord, type DescribeArgs, type RecordSchema, type SaveArgs } from '../schema.ts';

export function describeTask({ item, preset, clientId }: DescribeArgs<'task'>): RecordSchema {
  return {
    title: item ? 'Editar tarefa' : 'Nova obrigação / pendência',
    description: 'Agenda particular por cliente e competência.',
    fields: (
      <>
        <Field
          label="Cliente"
          name="clientId"
          value={clientId}
          options={clientOpts()}
          required
          wide
        />
        <Field
          label="Título da tarefa"
          name="title"
          value={item?.title || ''}
          wide
          required
          placeholder="Ex.: Verificar DAS, receber extratos, emitir NF"
        />
        <Field
          label="Categoria"
          name="category"
          value={item?.category || preset.category || 'Fiscal'}
          options={[
            ['Fiscal', 'Fiscal'],
            ['Documental', 'Documental'],
            ['Financeira', 'Financeira'],
            ['Atendimento', 'Atendimento'],
            ['Contábil', 'Contábil'],
            ['Outros', 'Outros'],
          ]}
        />
        <Field
          label="Competência"
          name="competence"
          value={item?.competence || state.month}
          type="month"
          required
        />
        <Field
          label="Data limite"
          name="dueDate"
          value={item?.dueDate || today}
          type="date"
          required
        />
        <Field
          label="Prioridade"
          name="priority"
          value={item?.priority || 'medium'}
          options={[
            ['high', 'Alta'],
            ['medium', 'Média'],
            ['low', 'Baixa'],
          ]}
        />
        <Field
          label="Situação"
          name="status"
          value={item?.status || 'pending'}
          options={[
            ['pending', 'Pendente'],
            ['progress', 'Em andamento'],
            ['done', 'Concluída'],
          ]}
        />
        <Field label="Observações" name="notes" value={item?.notes || ''} area wide />
        <label className="wide">
          <input
            type="checkbox"
            name="awaitingClient"
            defaultChecked={item?.awaitingClient === true}
          />{' '}
          Aguardando retorno do cliente
        </label>
      </>
    ),
  };
}

export async function saveTask({ values, item, form }: SaveArgs<'task'>): Promise<void> {
  if (item && item.clientId !== values.clientId)
    return toast('Não altere a empresa desta tarefa; crie outra para a empresa correta.', true);
  const title = values.title.trim();
  if (!title) return toast('Informe um título para a tarefa.', true);
  const record = asRecord<'task'>({
    ...values,
    awaitingClient: Object.hasOwn(values, 'awaitingClient'),
    title,
    id: item?.id || id(),
  });
  const ok = await mutate(() => {
    if (item) Object.assign(item, record);
    else panelWorkspace.data.tasks.push(record);
  }, 'Tarefa salva.');
  if (ok) {
    const file = form.querySelector<HTMLInputElement>('#f-internal-doc')?.files?.[0];
    closeModal();
    if (file) void openInternalDocs('task', record.id, file);
    if (item) void publishInternalDoc('task', record.id, true);
  }
}
