import { requests } from './state.ts';
import type { AdminAttachment } from './types.ts';

function company(id: string): string {
  return requests.state.companies.find((c) => c.id === id)?.name || 'Empresa removida';
}

function attachmentsFor(noticeId: string): AdminAttachment[] {
  return requests.state.attachments.filter((a) => a.notice_id === noticeId);
}

export { attachmentsFor, company };
