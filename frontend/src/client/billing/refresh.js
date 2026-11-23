import { clientActivity, clientDevice } from '../device/state.js';
import { $, api } from '../api.js';
import { daysRemaining } from './format.js';
import { showBilling } from './BillingOverview.jsx';
import { status, view } from '../view.js';
import { refreshPushPreference } from '../device/registration.js';
import { recoverTest } from '../device/testReceipt.js';

async function refresh() {
  const version = clientDevice.screenVersion;
  const data = await api('client-list');
  if (version !== clientDevice.screenVersion) return;
  const byClient = new Map(
    (data.companies || []).map((c) => [c.admin_id + '|' + c.client_id, c.company]),
  );
  const notices = Array.isArray(data.notices) ? data.notices : [];
  const filter = $('#client-notice-filter')?.value || 'pending';
  const localItems = notices.filter(
    (n) => filter === 'all' || (filter === 'paid' ? n.status === 'paid' : n.status !== 'paid'),
  );
  const rank = (n) =>
    n.status === 'paid'
      ? 3
      : n.reminder_enabled && n.due_date
        ? daysRemaining(n.due_date) < 0
          ? 0
          : daysRemaining(n.due_date) <= 3
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
  const overdue = pending.filter((n) => daysRemaining(n.due_date) < 0);
  const next3 = pending.filter((n) => {
    const days = daysRemaining(n.due_date);
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
