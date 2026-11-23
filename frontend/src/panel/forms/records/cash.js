import { panelWorkspace } from '../../state/workspace.js';
import { clientOpts, field, invoiceOpts } from '../fields.js';
import { brl, id, n, today } from '../../shared/format.js';
import { issued, openInvoice, paidToInvoice } from '../../state/selectors.js';
import { toast } from '../../shared/feedback.js';
import { mutate } from '../../state/transactions.js';
import { closeModal } from '../dialog.js';

export function describeCash({ item, preset, clientId }) {
  const title = item ? 'Editar lançamento' : 'Nova movimentação financeira';
  const description = 'Lance entradas e saídas no caixa do cliente.';
  let linkedInv = item?.invoiceId || preset.invoiceId || '';
  if (linkedInv) {
    const chosen = panelWorkspace.data.invoices.find((i) => i.id === linkedInv);
    if (chosen) clientId = chosen.clientId;
  }
  const fields = [
    field('Cliente', 'clientId', clientId, {
      options: clientOpts(),
      required: true,
      wide: true,
    }),
    field('Tipo', 'kind', item?.kind || 'receipt', {
      options: [
        ['receipt', 'Recebimento / entrada'],
        ['expense', 'Despesa / saída'],
      ],
      required: true,
    }),
    field('Data da movimentação', 'date', item?.date || today, {
      type: 'date',
      required: true,
    }),
    field(
      'Valor (R$)',
      'value',
      item?.value ??
        (linkedInv
          ? openInvoice(panelWorkspace.data.invoices.find((i) => i.id === linkedInv) || {})
          : 0),
      {
        type: 'number',
        required: true,
      },
    ),
    field(
      'Categoria',
      'category',
      item?.category || (linkedInv ? 'Recebimento de nota fiscal' : ''),
      {
        placeholder: 'Ex.: Serviços / Aluguel / Fornecedor',
        required: true,
      },
    ),
    field('NF vinculada (opcional)', 'invoiceId', linkedInv, {
      options: invoiceOpts(clientId),
      wide: true,
      help: 'Vincule um recebimento à NF correspondente para abater o saldo em aberto.',
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
export async function saveCash({ values, item }) {
  values.invoiceId = values.invoiceId || '';
  values.category = values.category.trim();
  if (!values.category) return toast('Informe a categoria da movimentação.', true);
  values.value = n(values.value);
  if (values.value <= 0) return toast('Informe um valor maior que zero.', true);
  if (values.invoiceId) {
    const inv = panelWorkspace.data.invoices.find((x) => x.id === values.invoiceId);
    if (!inv || inv.clientId !== values.clientId || !issued(inv) || values.kind !== 'receipt')
      return toast('Vincule somente recebimentos a NFs emitidas do mesmo cliente.', true);
    const prior =
      paidToInvoice(inv.id) -
      (item?.invoiceId === inv.id && item?.kind === 'receipt' ? n(item.value) : 0);
    if (prior + values.value > n(inv.value) + 0.005)
      return toast(
        `Este recebimento supera o saldo da NF. Disponível: ${brl(inv.value - prior)}.`,
        true,
      );
  }
  const record = {
    ...values,
    id: item?.id || id(),
  };
  const ok = await mutate(() => {
    if (item) Object.assign(item, record);
    else panelWorkspace.data.cash.push(record);
  }, 'Movimentação salva.');
  if (ok) closeModal();
}
