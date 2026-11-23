import { daysRemaining, money } from '../../billing/format.ts';
import { safeDate } from '../../view.ts';
import type { Notice } from '../../types.ts';
import { AttachedDocuments } from './components/AttachedDocuments/index.tsx';
import styles from './NoticeCard.module.css';
import type { NoticeCardProps } from './types.ts';

function dueLabel(notice: Notice): string {
  if (notice.status === 'paid') return 'Pago';
  if (!notice.due_date) return 'Comunicado';
  const days = daysRemaining(notice.due_date) ?? 0;
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanhã';
  return days > 1 ? 'Faltam ' + days + ' dias' : 'Prazo vencido';
}

export function NoticeCard({ notice, company, attachments }: NoticeCardProps) {
  return (
    <article className="notice-card">
      <div className={styles.heading}>
        <h3>
          {notice.reminder_enabled && notice.notice_type + ' · '}
          {notice.title}
        </h3>
        <span className="pill">{dueLabel(notice)}</span>
      </div>
      {notice.reminder_enabled && notice.amount_cents != null && (
        <strong className="bill-amount">{money(notice.amount_cents)}</strong>
      )}
      <p>{notice.body}</p>
      <div className="meta">
        {company}
        {notice.due_date && ' · Vencimento: ' + safeDate(notice.due_date)} · Publicado em{' '}
        {new Date(notice.created_at).toLocaleDateString('pt-BR')}
      </div>
      <AttachedDocuments attachments={attachments} />
    </article>
  );
}
