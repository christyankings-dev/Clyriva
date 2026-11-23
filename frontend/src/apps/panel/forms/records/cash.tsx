import { panelWorkspace } from '../../state/workspace.ts';
import { brl, id, n, today } from '../../lib/format.ts';
import { issued, openInvoice, paidToInvoice } from '../../state/selectors.ts';
import { toast } from '../../lib/feedback.ts';
import { mutate } from '../../state/transactions.ts';
import { closeModal } from '../dialog.tsx';
import { clientOpts, Field, invoiceOpts } from '../fields.tsx';
import { asRecord, type DescribeArgs, type RecordSchema, type SaveArgs } from '../schema.ts';

export function describeCash({ item, preset, clientId }: DescribeArgs<'cash'>): RecordSchema {
  const linkedInv = item?.invoiceId || preset.invoiceId || '';
  const chosen = linkedInv ? panelWorkspace.data.invoices.find((i) => i.id === linkedInv) : null;
  const owner = chosen ? chosen.clientId : clientId;
  return {
    title: item ? 'Editar lançamento' : 'Nova movimentação financeira',
    description: 'Lance entradas e saídas no caixa do cliente.',
    fields: (
      <>
        <Field label="Cliente" name="clientId" value={owner} options={clientOpts()} required wide />
        <Field
          label="Tipo"
          name="kind"
          value={item?.kind || 'receipt'}
          options={[
            ['receipt', 'Recebimento / entrada'],
            ['expense', 'Despesa / saída'],
          ]}
          required
        />
        <Field
          label="Data da movimentação"
          name="date"
          value={item?.date || today}
          type="date"
          required
        />
        <Field
          label="Valor (R$)"
          name="value"
          value={item?.value ?? (chosen ? openInvoice(chosen) : 0)}
          type="number"
          required
        />
        <Field
          label="Categoria"
          name="category"
          value={item?.category || (linkedInv ? 'Recebimento de nota fiscal' : '')}
          placeholder="Ex.: Serviços / Aluguel / Fornecedor"
          required
        />
        <Field
          label="NF vinculada (opcional)"
          name="invoiceId"
          value={linkedInv}
          options={invoiceOpts(owner)}
          wide
          help="Vincule um recebimento à NF correspondente para abater o saldo em aberto."
        />
        <Field label="Observações" name="notes" value={item?.notes || ''} area wide />
      </>
    ),
  };
}

export async function saveCash({ values, item }: SaveArgs<'cash'>): Promise<void> {
  const invoiceId = values.invoiceId || '';
  const category = values.category.trim();
  if (!category) return toast('Informe a categoria da movimentação.', true);
  const value = n(values.value);
  if (value <= 0) return toast('Informe um valor maior que zero.', true);
  if (invoiceId) {
    const inv = panelWorkspace.data.invoices.find((x) => x.id === invoiceId);
    if (!inv || inv.clientId !== values.clientId || !issued(inv) || values.kind !== 'receipt')
      return toast('Vincule somente recebimentos a NFs emitidas do mesmo cliente.', true);
    const prior =
      paidToInvoice(inv.id) -
      (item?.invoiceId === inv.id && item?.kind === 'receipt' ? n(item.value) : 0);
    if (prior + value > n(inv.value) + 0.005)
      return toast(
        `Este recebimento supera o saldo da NF. Disponível: ${brl(n(inv.value) - prior)}.`,
        true,
      );
  }
  const record = asRecord<'cash'>({ ...values, invoiceId, category, value, id: item?.id || id() });
  const ok = await mutate(() => {
    if (item) Object.assign(item, record);
    else panelWorkspace.data.cash.push(record);
  }, 'Movimentação salva.');
  if (ok) closeModal();
}
