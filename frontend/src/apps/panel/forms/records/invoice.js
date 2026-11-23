import { clientOpts, field } from '../fields.js';
import { id, n, today } from '../../lib/format.js';
import { state } from '../../state/filters.js';
import { toast } from '../../lib/feedback.js';
import { panelWorkspace } from '../../state/workspace.js';
import { paidToInvoice } from '../../state/selectors.js';
import { mutate } from '../../state/transactions.js';
import { closeModal } from '../dialog.js';

export function describeInvoice({ item, clientId }) {
  const title = item ? 'Editar nota fiscal' : 'Registrar nota fiscal';
  const description = 'Controle manual de notas emitidas, previstas e canceladas.';
  const fields = [
    field('Cliente', 'clientId', clientId, {
      options: clientOpts(),
      required: true,
      wide: true,
    }),
    field('Número da NF', 'number', item?.number || '', {
      placeholder: 'Ex.: 000017',
      required: false,
    }),
    field('Data de emissão / prevista', 'date', item?.date || today, {
      type: 'date',
      required: true,
    }),
    field('Competência', 'competence', item?.competence || state.month, {
      type: 'month',
      required: true,
    }),
    field('Valor da nota (R$)', 'value', item?.value ?? 0, {
      type: 'number',
      required: true,
    }),
    field('Situação', 'status', item?.status || 'issued', {
      options: [
        ['issued', 'Emitida'],
        ['pending', 'A emitir'],
        ['canceled', 'Cancelada'],
      ],
    }),
    field('Descrição do serviço / operação', 'description', item?.description || '', {
      wide: true,
      placeholder: 'Ex.: Prestação de serviços - competência mensal',
    }),
  ].join('');
  return {
    title,
    description,
    fields,
  };
}
export async function saveInvoice({ values, item }) {
  values.value = n(values.value);
  if (values.value < 0) return toast('O valor não pode ser negativo.', true);
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
  if (item && values.value + 0.005 < paidToInvoice(item.id))
    return toast('O valor da NF não pode ser menor que os recebimentos vinculados.', true);
  const record = {
    ...values,
    id: item?.id || id(),
  };
  const ok = await mutate(() => {
    if (item) Object.assign(item, record);
    else panelWorkspace.data.invoices.push(record);
  }, 'Nota fiscal salva.');
  if (ok) closeModal();
}
