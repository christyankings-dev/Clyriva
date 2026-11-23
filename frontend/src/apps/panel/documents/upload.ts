import { errorInfo } from '../../../shared/lib/errors.ts';
import { internalDocsApi, type InternalDocsReply } from './api.ts';

/** Estado de uma tentativa de envio, para retomar sem duplicar o anexo. */
export interface UploadAttempt {
  file: File;
  ticket: InternalDocsReply | null;
  uploaded: boolean;
}

async function uploadInternalDoc(
  type: string,
  recordId: string,
  attempt: UploadAttempt,
): Promise<void> {
  const file = attempt.file;
  attempt.ticket ??= await internalDocsApi('start', {
    entityType: type,
    entityId: recordId,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  const start = attempt.ticket;
  if (!attempt.uploaded) {
    const config = window.CLYRIVA_CONFIG ?? {};
    const storage = window.supabase.createClient(
      config.supabaseUrl ?? '',
      config.supabaseAnonKey ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
    const { error } = await storage.storage
      .from('clyriva-client-attachments')
      .uploadToSignedUrl(start.path ?? '', start.token ?? '', file, {
        contentType: file.type,
        upsert: false,
      });
    if (error) {
      // O navegador pode perder a confirmação mesmo que o Storage tenha recebido o arquivo.
      try {
        await internalDocsApi('complete', {
          attachmentId: start.attachmentId,
        });
        return;
      } catch {
        throw Error('Falha no envio. Tente novamente com este arquivo.');
      }
    }
    attempt.uploaded = true;
  }
  try {
    await internalDocsApi('complete', {
      attachmentId: start.attachmentId,
    });
  } catch (e) {
    if ([400, 404].includes(errorInfo(e).status ?? 0)) {
      attempt.ticket = null;
      attempt.uploaded = false;
    }
    throw e;
  }
}

export { uploadInternalDoc };
