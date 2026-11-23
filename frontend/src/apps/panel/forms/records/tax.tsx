import { state } from '../../state/filters.ts';
import { id, localToday, n, today } from '../../lib/format.ts';
import { toast } from '../../lib/feedback.ts';
import { mutate } from '../../state/transactions.ts';
import { panelWorkspace } from '../../state/workspace.ts';
import { closeModal } from '../dialog.tsx';
import { openInternalDocs } from '../../documents/openDocs.ts';
import { publishInternalDoc } from '../../documents/publish.ts';
import { clientOpts, Field } from '../fields.tsx';
import { asRecord, type DescribeArgs, type RecordSchema, type SaveArgs } from '../schema.ts';

export function describeTax({ item, preset, clientId }: DescribeArgs<'tax'>): RecordSchema {
  return {
    title: item ? 'Editar guia ou tributo' : 'Registrar guia ou tributo',
    description: 'Registre os dados da guia oficial. Sem cálculo tributário automático.',
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
          label="Tributo ou guia"
          name="kind"
          value={item?.kind || 'DAS'}
          options={[
            ['DAS', 'DAS (MEI / Simples)'],
            ['DARF', 'DARF'],
            ['ISS', 'ISS'],
            ['INSS', 'INSS'],
            ['FGTS', 'FGTS'],
            ['Outro', 'Outro'],
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
          label="Vencimento"
          name="dueDate"
          value={item?.dueDate || today}
          type="date"
          required
        />
        <Field
          label="Valor da guia (R$)"
          name="value"
          value={item?.value ?? 0}
          type="number"
          required
        />
        <Field
          label="Status"
          name="status"
          value={preset.status || item?.status || 'open'}
          options={[
            ['open', 'Em aberto'],
            ['paid', 'Pago'],
          ]}
        />
        <Field
          label="Data do pagamento"
          name="paidAt"
          value={item?.paidAt || (preset.status === 'paid' ? localToday() : '')}
          type="date"
        />
        <Field
          label="Número / identificação da guia"
          name="ref"
          value={item?.ref || ''}
          placeholder="Opcional"
        />
        <Field label="Observações" name="notes" value={item?.notes || ''} wide area />
      </>
    ),
  };
}

export async function saveTax({ values, item, form }: SaveArgs<'tax'>): Promise<void> {
  if (item && item.clientId !== values.clientId)
    return toast('Não altere a empresa desta guia; crie outra para a empresa correta.', true);
  const value = n(values.value);
  if (value < 0) return toast('O valor da guia não pode ser negativo.', true);
  if (values.status === 'paid' && !values.paidAt)
    return toast('Informe a data do pagamento da guia.', true);
  const record = asRecord<'tax'>({
    ...values,
    value,
    paidAt: values.status === 'open' ? '' : values.paidAt,
    id: item?.id || id(),
  });
  const ok = await mutate(() => {
    if (item) Object.assign(item, record);
    else panelWorkspace.data.taxes.push(record);
  }, 'Guia salva.');
  if (ok) {
    const file = form.querySelector<HTMLInputElement>('#f-internal-doc')?.files?.[0];
    closeModal();
    if (file) void openInternalDocs('tax', record.id, file);
    if (item) void publishInternalDoc('tax', record.id, true);
  }
}
