import { api } from '../../../../api.ts';
import { editCharge } from '../../../../billing/form.ts';
import { refresh } from '../../../../records/refresh.ts';
import { company } from '../../../../selectors.ts';
import { fmtDate, fmtMoney, status } from '../../../../ui.ts';
import type { AdminNotice } from '../../../../types.ts';
import { ActionButton } from '../../../ActionButton/index.tsx';
import { AttachmentBlock } from '../AttachmentBlock/index.tsx';

function statusLabel(n: AdminNotice, bill: boolean): string {
  if (n.status === 'paid') return 'Pago';
  if (n.status === 'archived') return 'Arquivado';
  return bill ? 'A vencer' : 'Publicado';
}

function deliveryLine(n: AdminNotice): string {
  return n.last_delivery
    ? 'Último lembrete aceito pelo serviço: ' +
        fmtDate(n.last_delivery.date) +
        ' (D-' +
        n.last_delivery.daysBefore +
        ').'
    : 'Lembretes ainda não enviados para dispositivo inscrito.';
}

function reminderText(n: AdminNotice): string {
  return (
    'Olá! Lembrete de ' +
    n.notice_type +
    ': ' +
    n.title +
    '\nValor: ' +
    fmtMoney(n.amount_cents) +
    '\nVencimento: ' +
    fmtDate(n.due_date) +
    '\n' +
    (n.body || 'Confira a guia e os dados de pagamento.')
  );
}

async function copyReminder(n: AdminNotice): Promise<void> {
  try {
    await navigator.clipboard.writeText(reminderText(n));
    status('#admin-feedback', 'Lembrete copiado para enviar ao cliente.');
  } catch {
    status('#admin-feedback', 'Não foi possível copiar automaticamente.', true);
  }
}

async function runNoticeAction(n: AdminNotice, action: string, done?: string): Promise<void> {
  await api(action, { noticeId: n.id });
  if (done) status('#admin-feedback', done);
  await refresh();
}

export function NoticeCard({ notice: n }: { notice: AdminNotice }) {
  const bill = !!n.reminder_enabled;
  const linked = Boolean(n.source_type && n.source_id);
  return (
    <article className="notice-card">
      <div className="between">
        <strong>{(bill ? n.notice_type + ' · ' : '') + n.title}</strong>
        <span className={n.status === 'paid' ? 'pill' : 'meta'}>{statusLabel(n, bill)}</span>
      </div>
      <p>{n.body}</p>
      {linked && (
        <div className="meta">
          Vinculada à ficha do cliente: altere valor, vencimento e pagamento na guia original, no
          painel principal. Aqui você pode consultar documentos e arquivar a publicação.
        </div>
      )}
      <div className="meta">
        {company(n.client_id) +
          ' · Vencimento: ' +
          fmtDate(n.due_date) +
          (bill ? ' · ' + fmtMoney(n.amount_cents) : '')}
      </div>
      {bill && <div className="meta">{deliveryLine(n)}</div>}
      {bill && n.status === 'paid' && !linked && (
        <ActionButton
          label="Reabrir cobrança"
          confirmText="Reabrir esta cobrança? Ela voltará a enviar lembretes nos dias devidos."
          onRun={() =>
            runNoticeAction(n, 'reopen-charge', 'Cobrança reaberta. Lembretes futuros retomados.')
          }
        />
      )}
      {bill && n.status === 'active' && (
        <>
          <ActionButton
            label="Copiar lembrete"
            style={{ margin: '8px 0 8px 0' }}
            onRun={() => copyReminder(n)}
          />
          {!linked && (
            <>
              <button type="button" className="btn" onClick={() => editCharge(n)}>
                Editar cobrança
              </button>
              <ActionButton
                label="Marcar como pago"
                style={{ margin: '8px' }}
                confirmText="Confirmar o pagamento? Os lembretes futuros desta cobrança serão interrompidos."
                onRun={() =>
                  runNoticeAction(
                    n,
                    'mark-paid',
                    'Cobrança marcada como paga. Lembretes futuros suspensos.',
                  )
                }
              />
            </>
          )}
        </>
      )}
      {n.status !== 'archived' && (
        <ActionButton
          label="Arquivar"
          style={{ marginTop: '8px' }}
          confirmText="Arquivar este registro? Ele deixará de aparecer para o cliente e não enviará mais lembretes."
          onRun={() => runNoticeAction(n, 'archive')}
        />
      )}
      <AttachmentBlock notice={n} />
    </article>
  );
}
