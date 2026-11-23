import { client, feeRecord } from '../../state/selectors.js';
import { state } from '../../state/filters.js';
import { clientOpts, field } from '../fields.js';
import { id, n } from '../../lib/format.js';
import { toast } from '../../lib/feedback.js';
import { mutate } from '../../state/transactions.js';
import { panelWorkspace } from '../../state/workspace.js';
import { closeModal } from '../dialog.js';

export function describeFee({ item, clientId }) {
  const old = feeRecord(clientId, state.month),
    r = item || old;
  const title = 'Registrar meus honorários';
  const description =
    'Uma cobrança por cliente e competência; altere os valores pagos conforme o recebimento.';
  const fields = [
    field('Cliente', 'clientId', clientId, {
      options: clientOpts(),
      required: true,
      wide: true,
    }),
    field('Competência', 'competence', r?.competence || state.month, {
      type: 'month',
      required: true,
    }),
    field('Valor devido (R$)', 'expected', r?.expected ?? n(client(clientId)?.monthlyFee), {
      type: 'number',
      required: true,
    }),
    field('Valor recebido (R$)', 'paid', r?.paid ?? 0, {
      type: 'number',
      required: true,
    }),
    field('Data do recebimento', 'paidAt', r?.paidAt || '', {
      type: 'date',
      help: 'Deixe vazio quando ainda não houver pagamento.',
    }),
    field('Observações sobre a cobrança', 'notes', r?.notes || '', {
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
export async function saveFee({ values }) {
  values.expected = n(values.expected);
  values.paid = n(values.paid);
  if (values.paid > values.expected + 0.005)
    return toast('O recebimento não pode ultrapassar o valor devido.', true);
  if (values.paid > 0 && !values.paidAt) return toast('Informe a data do recebimento.', true);
  if (values.paid === 0) values.paidAt = '';
  const existing = feeRecord(values.clientId, values.competence);
  const record = {
    ...values,
    id: existing?.id || id(),
  };
  const ok = await mutate(() => {
    if (existing) Object.assign(existing, record);
    else panelWorkspace.data.fees.push(record);
  }, 'Honorários registrados.');
  if (ok) closeModal();
}
