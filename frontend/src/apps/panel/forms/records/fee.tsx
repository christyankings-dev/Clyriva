import { client, feeRecord } from '../../state/selectors.ts';
import { state } from '../../state/filters.ts';
import { id, n } from '../../lib/format.ts';
import { toast } from '../../lib/feedback.ts';
import { mutate } from '../../state/transactions.ts';
import { panelWorkspace } from '../../state/workspace.ts';
import { closeModal } from '../dialog.tsx';
import { clientOpts, Field } from '../fields.tsx';
import { asRecord, type DescribeArgs, type RecordSchema, type SaveArgs } from '../schema.ts';

export function describeFee({ item, clientId }: DescribeArgs<'fee'>): RecordSchema {
  const r = item || feeRecord(clientId, state.month);
  return {
    title: 'Registrar meus honorários',
    description:
      'Uma cobrança por cliente e competência; altere os valores pagos conforme o recebimento.',
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
          label="Competência"
          name="competence"
          value={r?.competence || state.month}
          type="month"
          required
        />
        <Field
          label="Valor devido (R$)"
          name="expected"
          value={r?.expected ?? n(client(clientId)?.monthlyFee)}
          type="number"
          required
        />
        <Field
          label="Valor recebido (R$)"
          name="paid"
          value={r?.paid ?? 0}
          type="number"
          required
        />
        <Field
          label="Data do recebimento"
          name="paidAt"
          value={r?.paidAt || ''}
          type="date"
          help="Deixe vazio quando ainda não houver pagamento."
        />
        <Field label="Observações sobre a cobrança" name="notes" value={r?.notes || ''} wide area />
      </>
    ),
  };
}

export async function saveFee({ values }: SaveArgs<'fee'>): Promise<void> {
  const expected = n(values.expected);
  const paid = n(values.paid);
  if (paid > expected + 0.005)
    return toast('O recebimento não pode ultrapassar o valor devido.', true);
  if (paid > 0 && !values.paidAt) return toast('Informe a data do recebimento.', true);
  const existing = feeRecord(values.clientId, values.competence);
  const record = asRecord<'fee'>({
    ...values,
    expected,
    paid,
    paidAt: paid === 0 ? '' : values.paidAt,
    id: existing?.id || id(),
  });
  const ok = await mutate(() => {
    if (existing) Object.assign(existing, record);
    else panelWorkspace.data.fees.push(record);
  }, 'Honorários registrados.');
  if (ok) closeModal();
}
