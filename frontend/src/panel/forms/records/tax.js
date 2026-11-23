import { clientOpts, field } from '../fields.js';
import { state } from '../../state/filters.js';
import { id, localToday, n, today } from '../../shared/format.js';
import { toast } from '../../shared/feedback.js';
import { mutate } from '../../state/transactions.js';
import { panelWorkspace } from '../../state/workspace.js';
import { closeModal } from '../dialog.js';
import { openInternalDocs } from '../../documents/dialog.js';
import { publishInternalDoc } from '../../documents/publish.js';

export function describeTax({ item, preset, clientId }) {
  const title = item ? 'Editar guia ou tributo' : 'Registrar guia ou tributo';
  const description = 'Registre os dados da guia oficial. Sem cálculo tributário automático.';
  const fields = [
    field('Cliente', 'clientId', clientId, {
      options: clientOpts(),
      required: true,
      wide: true,
    }),
    field('Tributo ou guia', 'kind', item?.kind || 'DAS', {
      options: [
        ['DAS', 'DAS (MEI / Simples)'],
        ['DARF', 'DARF'],
        ['ISS', 'ISS'],
        ['INSS', 'INSS'],
        ['FGTS', 'FGTS'],
        ['Outro', 'Outro'],
      ],
    }),
    field('Competência', 'competence', item?.competence || state.month, {
      type: 'month',
      required: true,
    }),
    field('Vencimento', 'dueDate', item?.dueDate || today, {
      type: 'date',
      required: true,
    }),
    field('Valor da guia (R$)', 'value', item?.value ?? 0, {
      type: 'number',
      required: true,
    }),
    field('Status', 'status', preset.status || item?.status || 'open', {
      options: [
        ['open', 'Em aberto'],
        ['paid', 'Pago'],
      ],
    }),
    field(
      'Data do pagamento',
      'paidAt',
      item?.paidAt || (preset.status === 'paid' ? localToday() : ''),
      {
        type: 'date',
      },
    ),
    field('Número / identificação da guia', 'ref', item?.ref || '', {
      placeholder: 'Opcional',
    }),
    field('Observações', 'notes', item?.notes || '', {
      wide: true,
      area: true,
    }),
  ].join('');
  return {
    title,
    description,
    fields,
  };
}
export async function saveTax({ values, item, form }) {
  if (item && item.clientId !== values.clientId)
    return toast('Não altere a empresa desta guia; crie outra para a empresa correta.', true);
  values.value = n(values.value);
  if (values.value < 0) return toast('O valor da guia não pode ser negativo.', true);
  if (values.status === 'paid' && !values.paidAt)
    return toast('Informe a data do pagamento da guia.', true);
  if (values.status === 'open') values.paidAt = '';
  const record = {
    ...values,
    id: item?.id || id(),
  };
  const ok = await mutate(() => {
    if (item) Object.assign(item, record);
    else panelWorkspace.data.taxes.push(record);
  }, 'Guia salva.');
  if (ok) {
    const file = form.querySelector('#f-internal-doc')?.files?.[0];
    closeModal();
    if (file) openInternalDocs('tax', record.id, file);
    if (item) publishInternalDoc('tax', record.id, true);
  }
}
