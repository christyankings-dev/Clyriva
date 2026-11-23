import { api } from '../api.js';
import { status } from '../view.js';

async function openDocument(id, download = false) {
  const tab = window.open('about:blank', '_blank');
  try {
    const result = await api('client-attachment-link', {
      attachmentId: id,
      download,
    });
    if (tab) {
      tab.opener = null;
      tab.location.replace(result.url);
    } else window.location.assign(result.url);
  } catch (error) {
    if (tab) tab.close();
    status('#client-feedback', error.message || 'Documento indisponível.', true);
  }
}

export { openDocument };
