import { clientActivity, clientDevice } from '../device/state.ts';
import { api } from '../api.ts';
import { $ } from '../../../shared/lib/dom.ts';
import { daysRemaining } from './format.ts';
import { showBilling } from '../components/BillingOverview/index.tsx';
import { status, view } from '../view.ts';
import { refreshPushPreference } from '../device/registration.ts';
import { recoverTest } from '../device/testReceipt.ts';
import type { ClientList, Notice } from '../types.ts';

/** Dias até o vencimento; sem data conta como 0, como no comportamento original. */
function daysLeft(notice: Notice): number {
  return daysRemaining(notice.due_date) ?? 0;
}

async function refresh(): Promise<void> {
  const version = clientDevice.screenVersion;
  const data = await api<ClientList>('client-list');
  if (version !== clientDevice.screenVersion) return;
  const byClient = new Map(
    (data.companies || []).map((c): [string, string] => [
      c.admin_id + '|' + c.client_id,
      c.company,
    ]),
  );
  const notices = Array.isArray(data.notices) ? data.notices : [];
  const filter = $<HTMLSelectElement>('#client-notice-filter')?.value || 'pending';
  const localItems = notices.filter(
    (n) => filter === 'all' || (filter === 'paid' ? n.status === 'paid' : n.status !== 'paid'),
  );
  const rank = (n: Notice): number =>
    n.status === 'paid'
      ? 3
      : n.reminder_enabled && n.due_date
        ? daysLeft(n) < 0
          ? 0
          : daysLeft(n) <= 3
            ? 1
            : 2
        : 2;
  localItems.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')) ||
      String(b.created_at || '').localeCompare(String(a.created_at || '')),
  );
  const pending = notices.filter((n) => n.reminder_enabled && n.status === 'active');
  const overdue = pending.filter((n) => daysLeft(n) < 0);
  const next3 = pending.filter((n) => {
    const days = daysLeft(n);
    return days >= 0 && days <= 3;
  });
  showBilling({
    items: localItems,
    companies: byClient,
    attachments: data.attachments || [],
    counts: [
      ['Em aberto', pending.length],
      ['Próximos 3 dias', next3.length],
      ['Vencidos', overdue.length],
      ['Pagos', notices.filter((n) => n.status === 'paid').length],
    ],
  });
  status(
    '#client-feedback',
    `${(data.companies || []).length} empresa(s) autorizada(s) · ${notices.length} aviso(s).`,
  );
  const entering = !clientActivity.loaded;
  clientActivity.loaded = true;
  view(true);
  if (entering) {
    refreshPushPreference();
    recoverTest();
  }
}

export { refresh };
