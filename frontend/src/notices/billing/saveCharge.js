import { requests } from '../state.js';
import { $, api } from '../api.js';
import { fileError, uploadAttachment } from '../documents/attachments.js';
import { refresh } from '../records/refresh.js';
import { resetChargeForm } from './form.js';
import { status } from '../ui.js';

async function createCharge(e) {
  e.preventDefault();
  if (requests.busy) return;
  requests.busy = true;
  const f = e.target,
    b = $('#charge-submit');
  b.disabled = true;
  try {
    const payload = Object.fromEntries(new FormData(f));
    payload.clientId = f.elements.clientId.value;
    const isEdit = !!f.dataset.editId;
    if (isEdit) payload.noticeId = f.dataset.editId;
    if (!isEdit) {
      if (!f.dataset.requestKey)
        f.dataset.requestKey =
          crypto.randomUUID?.() || '10000000-0000-4000-a000-' + String(Date.now()).slice(-12);
      payload.requestKey = f.dataset.requestKey;
    }
    const file = f.querySelector('#charge-attachment')?.files?.[0];
    if (file) {
      const issue = fileError(file);
      if (issue) throw Error(issue);
    }
    const result = await api(isEdit ? 'update-charge' : 'create-charge', payload);
    if (file) {
      try {
        await uploadAttachment(result.noticeId || payload.noticeId, file);
      } catch (error) {
        // Nunca duplicar cobrança quando o upload falhar. A edição retoma o registro já salvo.
        f.dataset.editId = result.noticeId || payload.noticeId;
        f.elements.clientId.disabled = true;
        $('#charge-heading').textContent = 'Anexar documento à cobrança já salva';
        $('#charge-submit').textContent = 'Tentar enviar o anexo novamente';
        $('#charge-cancel-edit').classList.remove('hidden');
        await refresh();
        throw Error(
          'Cobrança salva, mas o anexo falhou: ' + error.message + '. Você pode tentar novamente.',
        );
      }
    }
    resetChargeForm();
    await refresh();
    status(
      '#charge-feedback',
      (file ? 'Documento anexado com segurança. ' : '') +
        (isEdit
          ? 'Cobrança atualizada. Próximos lembretes usarão os dados corrigidos.'
          : result.alreadyExists
            ? 'Cadastro anterior confirmado. A cobrança não foi duplicada.'
            : 'Cobrança cadastrada. Serão enviados avisos no D-3, D-2, D-1 e vencimento, conforme o prazo.'),
    );
  } catch (err) {
    status('#charge-feedback', err.message, true);
  } finally {
    requests.busy = false;
    b.disabled = false;
  }
}

export { createCharge };
