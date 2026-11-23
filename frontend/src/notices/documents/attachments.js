import { api, client } from '../api.js';
import { requests } from '../state.js';
import { el, status } from '../ui.js';
import { refresh } from '../records/refresh.js';

const DOC_MAX = 5 * 1024 * 1024;

const DOC_MIMES = ['application/pdf', 'image/jpeg', 'image/png'];

function fileError(file) {
  if (!file) return 'Escolha um arquivo.';
  if (file.size < 1 || file.size > DOC_MAX) return 'O arquivo precisa ter até 5 MB.';
  if (!DOC_MIMES.includes(file.type)) return 'Apenas PDF, JPG e PNG são aceitos.';
  return null;
}

async function uploadAttachment(noticeId, file) {
  const issue = fileError(file);
  if (issue) throw Error(issue);
  const start = await api('attachment-start', {
    noticeId,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  const result = await client.storage
    .from('clyriva-client-attachments')
    .uploadToSignedUrl(start.path, start.token, file, {
      contentType: file.type,
      upsert: false,
    });
  if (result.error) throw Error('O documento não foi enviado. ' + result.error.message);
  await api('attachment-complete', {
    attachmentId: start.attachmentId,
  });
  return start.attachmentId;
}

function attachmentsFor(id) {
  return requests.state.attachments.filter((a) => a.notice_id === id);
}

async function openAttachment(id, download = false) {
  const tab = window.open('about:blank', '_blank');
  try {
    const doc = await api('attachment-link', {
      attachmentId: id,
      download,
    });
    if (tab) {
      tab.opener = null;
      tab.location.replace(doc.url);
    } else window.location.assign(doc.url);
  } catch (e) {
    if (tab) tab.close();
    status('#admin-feedback', e.message, true);
  }
}

function attachmentBlock(notice) {
  const block = el('div', null, 'document-list');
  const files = attachmentsFor(notice.id);
  block.append(
    el(
      'strong',
      files.length ? 'Documentos anexados (' + files.length + ')' : 'Sem documento anexado',
      'document-title',
    ),
  );
  for (const f of files) {
    const row = el('div', null, 'document-row');
    row.append(
      el(
        'span',
        '📎 ' + f.original_name + ' · ' + (f.size_bytes / 1024).toFixed(0) + ' KB',
        'document-name',
      ),
    );
    const view = el('button', 'Visualizar', 'btn');
    view.type = 'button';
    view.onclick = () => openAttachment(f.id);
    row.append(view);
    const download = el('button', 'Baixar', 'btn');
    download.type = 'button';
    download.onclick = () => openAttachment(f.id, true);
    row.append(download);
    const remove = el('button', 'Remover', 'btn');
    remove.type = 'button';
    remove.onclick = async () => {
      if (!confirm('Remover permanentemente o anexo ' + f.original_name + '?')) return;
      remove.disabled = true;
      try {
        await api('attachment-remove', {
          attachmentId: f.id,
        });
        await refresh();
        status('#admin-feedback', 'Anexo removido.');
      } catch (e) {
        status('#admin-feedback', e.message, true);
      } finally {
        remove.disabled = false;
      }
    };
    row.append(remove);
    block.append(row);
  }
  if (notice.status !== 'archived') {
    const picker = el('input');
    picker.type = 'file';
    picker.accept = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
    picker.className = 'hidden';
    const b = el('button', '+ Adicionar documento', 'btn');
    b.type = 'button';
    b.onclick = () => picker.click();
    picker.addEventListener('change', async () => {
      const file = picker.files?.[0];
      if (!file) return;
      b.disabled = true;
      status('#admin-feedback', 'Enviando ' + file.name + '…');
      try {
        await uploadAttachment(notice.id, file);
        await refresh();
        status('#admin-feedback', 'Anexo privado disponível para o cliente.');
      } catch (e) {
        status('#admin-feedback', e.message, true);
      } finally {
        b.disabled = false;
        picker.value = '';
      }
    });
    block.append(b, picker);
  }
  return block;
}

export { attachmentBlock, fileError, uploadAttachment };
