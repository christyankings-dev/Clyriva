import { daysRemaining, money } from './format.js';
import { safeDate } from '../view.js';
import { openDocument } from './openDocument.js';
import styles from './NoticeCard.module.css';

function dueLabel(notice) {
  if (notice.status === 'paid') return 'Pago';
  if (!notice.due_date) return 'Comunicado';
  const days = daysRemaining(notice.due_date);
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanhã';
  return days > 1 ? 'Faltam ' + days + ' dias' : 'Prazo vencido';
}

function AttachedDocuments({ attachments }) {
  if (!attachments.length) return null;
  return (
    <div className="document-list">
      <strong className="document-title">
        {attachments.length === 1 ? 'Guia ou documento anexo' : 'Documentos anexados'}
      </strong>
      {attachments.map((file) => (
        <div key={file.id} className="document-row">
          <span className="document-name">📎 {file.original_name}</span>
          <button type="button" className="btn" onClick={() => openDocument(file.id)}>
            Visualizar
          </button>
          <button type="button" className="btn" onClick={() => openDocument(file.id, true)}>
            Baixar
          </button>
        </div>
      ))}
    </div>
  );
}

export function NoticeCard({ notice, company, attachments }) {
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
