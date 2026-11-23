import { requests } from '../state.ts';
import { fileError, uploadAttachment } from '../documents/attachments.ts';
import { errorInfo } from '../../../shared/lib/errors.ts';
import { field } from '../../../shared/lib/dom.ts';
import { api } from '../api.ts';
import type { NoticeReply } from '../types.ts';
import { refresh } from './refresh.ts';
import { status } from '../ui.ts';

async function publish(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  if (requests.busy) return;
  requests.busy = true;
  const form = e.target as HTMLFormElement,
    b = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (b) b.disabled = true;
  try {
    const data: Record<string, unknown> = Object.fromEntries(new FormData(form));
    const file = form.querySelector<HTMLInputElement>('#notice-attachment')?.files?.[0];
    if (file) {
      const issue = fileError(file);
      if (issue) throw Error(issue);
    }
    const wantsNotify = field(form, 'notify').checked;
    data.notify = wantsNotify && !file;
    const result = await api<NoticeReply>('publish', data);
    let sent = result.pushSent || 0;
    if (file) {
      try {
        await uploadAttachment(result.noticeId, file);
      } catch (uploadError) {
        form.reset();
        await refresh();
        throw Error(
          'Comunicado publicado, mas arquivo não enviado: ' +
            errorInfo(uploadError).message +
            '. Use “Adicionar documento” no comunicado salvo. O formulário foi limpo para evitar duplicação.',
        );
      }
      if (wantsNotify) {
        const n = await api<NoticeReply>('notify-notice', {
          noticeId: result.noticeId,
        });
        sent = n.pushSent || 0;
      }
    }
    status(
      '#admin-feedback',
      'Aviso publicado' +
        (file ? ' com documento' : '') +
        '. Notificações aceitas pelo serviço: ' +
        sent +
        '. A entrega depende do celular.',
    );
    form.reset();
    await refresh();
  } catch (err) {
    status('#admin-feedback', errorInfo(err).message, true);
  } finally {
    requests.busy = false;
    if (b) b.disabled = false;
  }
}

export { publish };
