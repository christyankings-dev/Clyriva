const INTERNAL_DOC_MAX = 5242880;

const INTERNAL_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const docsEndpoint =
  (window.CLYRIVA_CONFIG?.supabaseUrl || '').replace(/\/$/, '') + '/functions/v1/clyriva-client';

async function internalDocsApi(action, payload = {}) {
  const token = await window.parent?.ClyrivaPanelHost?.token?.(window);
  if (!token) throw Error('Sua sessão administrativa expirou. Entre novamente.');
  const res = await fetch(docsEndpoint + '/admin-internal-' + action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
      apikey: window.CLYRIVA_CONFIG.supabaseAnonKey,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || !result.ok)
    throw Object.assign(Error(result.error || 'Falha ao acessar os documentos.'), {
      status: res.status,
    });
  return result;
}

function docIssue(file) {
  if (!file) return 'Escolha um documento.';
  if (file.size < 1 || file.size > INTERNAL_DOC_MAX) return 'Arquivo deve ter até 5 MB.';
  if (!INTERNAL_DOC_TYPES.includes(file.type)) return 'Use PDF, JPG ou PNG.';
  return '';
}

export { docIssue, internalDocsApi };
