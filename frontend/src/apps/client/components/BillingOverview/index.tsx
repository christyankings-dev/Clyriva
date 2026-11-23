import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { must } from '../../../../shared/lib/dom.ts';
import type { BillingView, NoticeAttachment } from '../../types.ts';
import { NoticeCard } from '../NoticeCard/index.tsx';

let listRoot: Root | undefined;
let summaryRoot: Root | undefined;

export function clearBilling(): void {
  listRoot?.unmount();
  summaryRoot?.unmount();
  listRoot = undefined;
  summaryRoot = undefined;
}

export function showBilling({ items, counts, companies, attachments }: BillingView): void {
  const list = (listRoot ??= createRoot(must('#client-notices')));
  const summary = (summaryRoot ??= createRoot(must('#client-billing-overview')));
  const documents = new Map<string, NoticeAttachment[]>();
  for (const file of attachments) {
    const files = documents.get(file.notice_id) ?? [];
    files.push(file);
    documents.set(file.notice_id, files);
  }
  flushSync(() => {
    list.render(
      items.length ? (
        items.map((notice) => (
          <NoticeCard
            key={notice.id}
            notice={notice}
            company={companies.get(notice.admin_id + '|' + notice.client_id) || 'Sua empresa'}
            attachments={documents.get(notice.id) || []}
          />
        ))
      ) : (
        <div className="empty">Nenhum aviso publicado para sua empresa até o momento.</div>
      ),
    );
    summary.render(
      counts.map(([label, value]) => (
        <div key={label} className="summary-item">
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      )),
    );
  });
}
