import { internalDocsApi } from './api.js';

async function uploadInternalDoc(type, recordId, attempt) {
  const file = attempt.file;
  if (!attempt.ticket) {
    attempt.ticket = await internalDocsApi('start', {
      entityType: type,
      entityId: recordId,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
  }
  const start = attempt.ticket;
  if (!attempt.uploaded) {
    const storage = window.supabase.createClient(
      window.CLYRIVA_CONFIG.supabaseUrl,
      window.CLYRIVA_CONFIG.supabaseAnonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
    const { error } = await storage.storage
      .from('clyriva-client-attachments')
      .uploadToSignedUrl(start.path, start.token, file, {
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
    if ([400, 404].includes(e.status)) {
      attempt.ticket = null;
      attempt.uploaded = false;
    }
    throw e;
  }
}

export { uploadInternalDoc };
