import { field, must } from '../../../shared/lib/dom.ts';
import type { AdminNotice } from '../types.ts';
import { moneyForInput, status } from '../ui.ts';

function chargeForm(): HTMLFormElement {
  return must<HTMLFormElement>('#charge-form');
}

function resetChargeForm(): void {
  const f = chargeForm();
  f.reset();
  delete f.dataset.editId;
  delete f.dataset.requestKey;
  field<HTMLSelectElement>(f, 'clientId').disabled = false;
  must('#charge-heading').textContent = 'Cadastrar cobrança com lembretes';
  must('#charge-submit').textContent = 'Cadastrar cobrança e programar lembretes';
  must('#charge-cancel-edit').classList.add('hidden');
  status('#charge-feedback', '');
  chargePreview();
}

function editCharge(n: AdminNotice): void {
  const f = chargeForm();
  const clientId = field<HTMLSelectElement>(f, 'clientId');
  clientId.value = n.client_id;
  clientId.disabled = true;
  field<HTMLSelectElement>(f, 'noticeType').value = n.notice_type;
  field(f, 'title').value = n.title;
  field(f, 'amount').value = moneyForInput(n.amount_cents);
  field(f, 'dueDate').value = n.due_date ?? '';
  field<HTMLTextAreaElement>(f, 'message').value =
    n.body === 'Cobrança cadastrada pela sua gestão. Consulte os detalhes antes de pagar.'
      ? ''
      : n.body;
  f.dataset.editId = n.id;
  must('#charge-heading').textContent = 'Editar cobrança';
  must('#charge-submit').textContent = 'Salvar alterações';
  must('#charge-cancel-edit').classList.remove('hidden');
  chargePreview();
  must('#charge-section').scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
  field(f, 'title').focus();
}

function chargePreview(): void {
  const f = chargeForm(),
    type = field<HTMLSelectElement>(f, 'noticeType').value || 'Cobrança',
    date = field(f, 'dueDate').value,
    amount = Number(field(f, 'amount').value || 0);
  const t =
    Number.isFinite(amount) && amount > 0
      ? ' · ' +
        amount.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
      : '';
  must('#charge-preview').textContent = date
    ? 'Avisos automáticos: ' +
      [3, 2, 1, 0]
        .map((d) => {
          const p = new Date(date + 'T12:00:00Z');
          p.setUTCDate(p.getUTCDate() - d);
          return (
            p.toLocaleDateString('pt-BR', {
              timeZone: 'UTC',
            }) +
            ' — ' +
            type +
            ' ' +
            (d === 0 ? 'vence hoje' : d === 1 ? 'vence amanhã' : `vence em ${d} dias`) +
            t
          );
        })
        .join(' | ')
    : 'Preencha o valor e o vencimento para visualizar os quatro lembretes automáticos.';
}

export { chargePreview, editCharge, resetChargeForm };
