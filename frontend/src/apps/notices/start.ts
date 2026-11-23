import { field, must } from '../../shared/lib/dom.ts';
import { errorInfo } from '../../shared/lib/errors.ts';
import { client } from './api.ts';
import { invite } from './access/invite.ts';
import { publish } from './records/publish.ts';
import { render } from './records/list.tsx';
import { exportCharges } from './billing/exportCharges.ts';
import { wipeAdminPage } from './access/clear.ts';
import { createCharge } from './billing/saveCharge.ts';
import { chargePreview, resetChargeForm } from './billing/form.ts';
import { status } from './ui.ts';
import { refresh } from './records/refresh.ts';
import { requests } from './state.ts';

async function init(): Promise<void> {
  must('#invite-form').addEventListener('submit', invite);
  must('#notice-form').addEventListener('submit', publish);
  must('#billing-filter').addEventListener('change', render);
  must('#billing-client-filter').addEventListener('change', render);
  must('#billing-export').addEventListener('click', exportCharges);
  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') wipeAdminPage();
  });
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('sb-') && !e.newValue) wipeAdminPage();
  });
  must('#charge-form').addEventListener('submit', createCharge);
  must('#charge-cancel-edit').addEventListener('click', resetChargeForm);
  for (const e of must('#charge-form').querySelectorAll('input,select,textarea'))
    e.addEventListener('input', chargePreview);
  chargePreview();
  must('#copy-client-link').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.origin + '/cliente.html');
      status('#admin-feedback', 'Link copiado.');
    } catch {
      status(
        '#admin-feedback',
        'Não foi possível copiar automaticamente. Link: ' + location.origin + '/cliente.html',
        true,
      );
    }
  });
  try {
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user) throw Error('Entre pelo painel administrativo primeiro.');
    const { data, error: e } = await client
      .from('clyriva_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (e || !data) throw Error('Esta página é exclusiva da gestão.');
    await refresh();
    const [section, query] = location.hash.slice(1).split('?');
    if (section === 'autorizar') {
      const form = must<HTMLFormElement>('#invite-form'),
        clientId = field<HTMLSelectElement>(form, 'clientId'),
        id = new URLSearchParams(query).get('empresa');
      if (id && requests.state.companies.some((c) => c.id === id && c.status !== 'inactive'))
        clientId.value = id;
      else if (id)
        status(
          '#invite-result',
          'A empresa indicada não está disponível. Selecione uma empresa ativa.',
          true,
        );
      must('#autorizar').scrollIntoView({
        block: 'start',
      });
      (clientId.value ? field(form, 'email') : clientId).focus({
        preventScroll: true,
      });
    }
  } catch (err) {
    status('#admin-feedback', errorInfo(err).message, true);
    must('#admin-loading').textContent = 'Acesse primeiro o painel com sua conta administrativa.';
  }
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', init, {
    once: true,
  });
else init();
