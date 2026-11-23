import type { DocumentRecord } from '../../../shared/agenda/types.ts';

const INTERNAL_DOC_MAX = 5242880;

const INTERNAL_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const docsEndpoint =
  (window.CLYRIVA_CONFIG?.supabaseUrl || '').replace(/\/$/, '') + '/functions/v1/clyriva-client';

/** Resposta das ações `admin-internal-*` (campos variam por ação). */
export interface InternalDocsReply {
  ok: true;
  attachments?: InternalAttachment[];
  source?: DocSource;
  audience?: { count: number; emails: string[] };
  attachmentErrors?: number;
  attachmentsAdded?: number;
  status?: string;
  skipped?: boolean;
  url?: string;
  path?: string;
  token?: string;
  attachmentId?: string;
  /** Resposta de `overview`: situação dos documentos de cada registro. */
  records?: DocumentRecord[];
}

export interface InternalAttachment {
  id: string;
  entity_type: string;
  entity_id: string;
  original_name: string;
}

export interface DocSource {
  companyName: string;
  label?: string;
  reference?: string;
  competence?: string;
  dueDate?: string;
  amount?: number;
  status?: string;
}

async function internalDocsApi(action: string, payload: object = {}): Promise<InternalDocsReply> {
  const token = await window.parent?.ClyrivaPanelHost?.token?.(window);
  if (!token) throw Error('Sua sessão administrativa expirou. Entre novamente.');
  const res = await fetch(docsEndpoint + '/admin-internal-' + action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
      apikey: window.CLYRIVA_CONFIG?.supabaseAnonKey ?? '',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const result: { ok?: boolean; error?: string } = await res.json().catch(() => ({}));
  if (!res.ok || !result.ok)
    throw Object.assign(Error(result.error || 'Falha ao acessar os documentos.'), {
      status: res.status,
    });
  return result as InternalDocsReply;
}

function docIssue(file: File | null | undefined): string {
  if (!file) return 'Escolha um documento.';
  if (file.size < 1 || file.size > INTERNAL_DOC_MAX) return 'Arquivo deve ter até 5 MB.';
  if (!INTERNAL_DOC_TYPES.includes(file.type)) return 'Use PDF, JPG ou PNG.';
  return '';
}

export { docIssue, internalDocsApi };
