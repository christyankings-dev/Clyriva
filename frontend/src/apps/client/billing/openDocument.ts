import { api } from '../api.ts';
import { errorInfo } from '../../../shared/lib/errors.ts';
import { status } from '../view.ts';

async function openDocument(id: string, download = false): Promise<void> {
  const tab = window.open('about:blank', '_blank');
  try {
    const result = await api<{ url: string }>('client-attachment-link', {
      attachmentId: id,
      download,
    });
    if (tab) {
      tab.opener = null;
      tab.location.replace(result.url);
    } else window.location.assign(result.url);
  } catch (error) {
    if (tab) tab.close();
    status('#client-feedback', errorInfo(error).message || 'Documento indisponível.', true);
  }
}

export { openDocument };
