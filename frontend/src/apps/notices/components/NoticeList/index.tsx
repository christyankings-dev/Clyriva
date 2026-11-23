import type { AdminNotice } from '../../types.ts';
import { NoticeCard } from './components/NoticeCard/index.tsx';

export function NoticeList({ notices }: { notices: AdminNotice[] }) {
  if (!notices.length) return <div className="empty">Nenhum aviso publicado ainda.</div>;
  return notices.map((notice) => <NoticeCard key={notice.id} notice={notice} />);
}
