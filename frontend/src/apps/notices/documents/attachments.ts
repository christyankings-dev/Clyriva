import { errorInfo } from '../../../shared/lib/errors.ts';
import { api, client } from '../api.ts';
import { status } from '../ui.ts';
import type { AttachmentStart } from '../types.ts';

const DOC_MAX = 5 * 1024 * 1024;

const DOC_MIMES = ['application/pdf', 'image/jpeg', 'image/png'];

function fileError(file: File | null | undefined): string | null {
  if (!file) return 'Escolha um arquivo.';
  if (file.size < 1 || file.size > DOC_MAX) return 'O arquivo precisa ter até 5 MB.';
  if (!DOC_MIMES.includes(file.type)) return 'Apenas PDF, JPG e PNG são aceitos.';
  return null;
}

async function uploadAttachment(noticeId: string, file: File): Promise<string> {
  const issue = fileError(file);
  if (issue) throw Error(issue);
  const start = await api<AttachmentStart>('attachment-start', {
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

/** Abre (ou baixa) um anexo privado por link assinado de curta duração. */
async function openAttachment(id: string, download = false): Promise<void> {
  const tab = window.open('about:blank', '_blank');
  try {
    const doc = await api<{ url: string }>('attachment-link', {
      attachmentId: id,
      download,
    });
    if (tab) {
      tab.opener = null;
      tab.location.replace(doc.url);
    } else window.location.assign(doc.url);
  } catch (e) {
    if (tab) tab.close();
    status('#admin-feedback', errorInfo(e).message, true);
  }
}

export { fileError, openAttachment, uploadAttachment };
