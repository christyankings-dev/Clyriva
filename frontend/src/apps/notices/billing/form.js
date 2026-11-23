import { $ } from '../api.js';
import { moneyForInput, status } from '../ui.js';

function resetChargeForm() {
  const f = $('#charge-form');
  f.reset();
  delete f.dataset.editId;
  delete f.dataset.requestKey;
  f.elements.clientId.disabled = false;
  $('#charge-heading').textContent = 'Cadastrar cobrança com lembretes';
  $('#charge-submit').textContent = 'Cadastrar cobrança e programar lembretes';
  $('#charge-cancel-edit').classList.add('hidden');
  status('#charge-feedback', '');
  chargePreview();
}

function editCharge(n) {
  const f = $('#charge-form');
  f.elements.clientId.value = n.client_id;
  f.elements.clientId.disabled = true;
  f.elements.noticeType.value = n.notice_type;
  f.elements.title.value = n.title;
  f.elements.amount.value = moneyForInput(n.amount_cents);
  f.elements.dueDate.value = n.due_date;
  f.elements.message.value =
    n.body === 'Cobrança cadastrada pela sua gestão. Consulte os detalhes antes de pagar.'
      ? ''
      : n.body;
  f.dataset.editId = n.id;
  $('#charge-heading').textContent = 'Editar cobrança';
  $('#charge-submit').textContent = 'Salvar alterações';
  $('#charge-cancel-edit').classList.remove('hidden');
  chargePreview();
  $('#charge-section').scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
  f.elements.title.focus();
}

function chargePreview() {
  const f = $('#charge-form'),
    type = f.elements.noticeType.value || 'Cobrança',
    date = f.elements.dueDate.value,
    amount = Number(f.elements.amount.value || 0);
  const t =
    Number.isFinite(amount) && amount > 0
      ? ' · ' +
        amount.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
      : '';
  $('#charge-preview').textContent = date
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
