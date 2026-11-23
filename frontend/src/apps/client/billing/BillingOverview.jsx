import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { NoticeCard } from './NoticeCard.jsx';

let listRoot;
let summaryRoot;

export function clearBilling() {
  listRoot?.unmount();
  summaryRoot?.unmount();
  listRoot = undefined;
  summaryRoot = undefined;
}

export function showBilling({ items, counts, companies, attachments }) {
  listRoot ??= createRoot(document.querySelector('#client-notices'));
  summaryRoot ??= createRoot(document.querySelector('#client-billing-overview'));
  const documents = new Map();
  for (const file of attachments) {
    const files = documents.get(file.notice_id) ?? [];
    files.push(file);
    documents.set(file.notice_id, files);
  }
  flushSync(() => {
    listRoot.render(
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
    summaryRoot.render(
      counts.map(([label, value]) => (
        <div key={label} className="summary-item">
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      )),
    );
  });
}
