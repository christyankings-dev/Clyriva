import { requests } from '../state.js';
import { fileError, uploadAttachment } from '../documents/attachments.js';
import { api } from '../api.js';
import { refresh } from './refresh.js';
import { status } from '../ui.js';

async function publish(e) {
  e.preventDefault();
  if (requests.busy) return;
  requests.busy = true;
  const form = e.target,
    b = form.querySelector('button[type="submit"]');
  b.disabled = true;
  try {
    const data = Object.fromEntries(new FormData(form));
    const file = form.querySelector('#notice-attachment')?.files?.[0];
    if (file) {
      const issue = fileError(file);
      if (issue) throw Error(issue);
    }
    const wantsNotify = form.elements.notify.checked;
    data.notify = wantsNotify && !file;
    const result = await api('publish', data);
    let sent = result.pushSent || 0;
    if (file) {
      try {
        await uploadAttachment(result.noticeId, file);
      } catch (e) {
        form.reset();
        await refresh();
        throw Error(
          'Comunicado publicado, mas arquivo não enviado: ' +
            e.message +
            '. Use “Adicionar documento” no comunicado salvo. O formulário foi limpo para evitar duplicação.',
        );
      }
      if (wantsNotify) {
        const n = await api('notify-notice', {
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
    status('#admin-feedback', err.message, true);
  } finally {
    requests.busy = false;
    b.disabled = false;
  }
}

export { publish };
