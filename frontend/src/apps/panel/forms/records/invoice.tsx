import { id, n, today } from '../../lib/format.ts';
import { state } from '../../state/filters.ts';
import { toast } from '../../lib/feedback.ts';
import { panelWorkspace } from '../../state/workspace.ts';
import { paidToInvoice } from '../../state/selectors.ts';
import { mutate } from '../../state/transactions.ts';
import { closeModal } from '../dialog.tsx';
import { clientOpts, Field } from '../fields.tsx';
import { asRecord, type DescribeArgs, type RecordSchema, type SaveArgs } from '../schema.ts';

export function describeInvoice({ item, clientId }: DescribeArgs<'invoice'>): RecordSchema {
  return {
    title: item ? 'Editar nota fiscal' : 'Registrar nota fiscal',
    description: 'Controle manual de notas emitidas, previstas e canceladas.',
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
          label="Número da NF"
          name="number"
          value={item?.number || ''}
          placeholder="Ex.: 000017"
        />
        <Field
          label="Data de emissão / prevista"
          name="date"
          value={item?.date || today}
          type="date"
          required
        />
        <Field
          label="Competência"
          name="competence"
          value={item?.competence || state.month}
          type="month"
          required
        />
        <Field
          label="Valor da nota (R$)"
          name="value"
          value={item?.value ?? 0}
          type="number"
          required
        />
        <Field
          label="Situação"
          name="status"
          value={item?.status || 'issued'}
          options={[
            ['issued', 'Emitida'],
            ['pending', 'A emitir'],
            ['canceled', 'Cancelada'],
          ]}
        />
        <Field
          label="Descrição do serviço / operação"
          name="description"
          value={item?.description || ''}
          wide
          placeholder="Ex.: Prestação de serviços - competência mensal"
        />
      </>
    ),
  };
}

export async function saveInvoice({ values, item }: SaveArgs<'invoice'>): Promise<void> {
  const value = n(values.value);
  if (value < 0) return toast('O valor não pode ser negativo.', true);
  if (
    item &&
    item.clientId !== values.clientId &&
    panelWorkspace.data.cash.some((r) => r.invoiceId === item.id)
  )
    return toast('Desvincule os recebimentos antes de mudar o cliente da NF.', true);
  if (item && values.status !== 'issued' && paidToInvoice(item.id) > 0)
    return toast(
      'Esta NF tem recebimentos vinculados. Desvincule-os antes de alterar a situação.',
      true,
    );
  if (item && value + 0.005 < paidToInvoice(item.id))
    return toast('O valor da NF não pode ser menor que os recebimentos vinculados.', true);
  const record = asRecord<'invoice'>({ ...values, value, id: item?.id || id() });
  const ok = await mutate(() => {
    if (item) Object.assign(item, record);
    else panelWorkspace.data.invoices.push(record);
  }, 'Nota fiscal salva.');
  if (ok) closeModal();
}
