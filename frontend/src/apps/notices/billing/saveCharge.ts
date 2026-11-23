import { requests } from '../state.ts';
import { field, must } from '../../../shared/lib/dom.ts';
import { errorInfo } from '../../../shared/lib/errors.ts';
import { api } from '../api.ts';
import type { ChargeReply } from '../types.ts';
import { fileError, uploadAttachment } from '../documents/attachments.ts';
import { refresh } from '../records/refresh.ts';
import { resetChargeForm } from './form.ts';
import { status } from '../ui.ts';

async function createCharge(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  if (requests.busy) return;
  requests.busy = true;
  const f = e.target as HTMLFormElement,
    b = must<HTMLButtonElement>('#charge-submit');
  b.disabled = true;
  try {
    const payload: Record<string, unknown> = Object.fromEntries(new FormData(f));
    payload.clientId = field<HTMLSelectElement>(f, 'clientId').value;
    const isEdit = !!f.dataset.editId;
    if (isEdit) payload.noticeId = f.dataset.editId;
    if (!isEdit) {
      if (!f.dataset.requestKey)
        f.dataset.requestKey =
          crypto.randomUUID?.() || '10000000-0000-4000-a000-' + String(Date.now()).slice(-12);
      payload.requestKey = f.dataset.requestKey;
    }
    const file = f.querySelector<HTMLInputElement>('#charge-attachment')?.files?.[0];
    if (file) {
      const issue = fileError(file);
      if (issue) throw Error(issue);
    }
    const result = await api<ChargeReply>(isEdit ? 'update-charge' : 'create-charge', payload);
    if (file) {
      try {
        await uploadAttachment(String(result.noticeId || payload.noticeId), file);
      } catch (error) {
        // Nunca duplicar cobrança quando o upload falhar. A edição retoma o registro já salvo.
        f.dataset.editId = String(result.noticeId || payload.noticeId);
        field<HTMLSelectElement>(f, 'clientId').disabled = true;
        must('#charge-heading').textContent = 'Anexar documento à cobrança já salva';
        must('#charge-submit').textContent = 'Tentar enviar o anexo novamente';
        must('#charge-cancel-edit').classList.remove('hidden');
        await refresh();
        throw Error(
          'Cobrança salva, mas o anexo falhou: ' +
            errorInfo(error).message +
            '. Você pode tentar novamente.',
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
    status('#charge-feedback', errorInfo(err).message, true);
  } finally {
    requests.busy = false;
    b.disabled = false;
  }
}

export { createCharge };
