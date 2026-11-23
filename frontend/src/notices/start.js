import { $, client } from './api.js';
import { invite } from './access/invite.js';
import { publish } from './records/publish.js';
import { render } from './records/list.js';
import { exportCharges } from './billing/exportCharges.js';
import { wipeAdminPage } from './access/clear.js';
import { createCharge } from './billing/saveCharge.js';
import { chargePreview, resetChargeForm } from './billing/form.js';
import { status } from './ui.js';
import { refresh } from './records/refresh.js';
import { requests } from './state.js';

async function init() {
  $('#invite-form').addEventListener('submit', invite);
  $('#notice-form').addEventListener('submit', publish);
  $('#billing-filter').addEventListener('change', render);
  $('#billing-client-filter').addEventListener('change', render);
  $('#billing-export').addEventListener('click', exportCharges);
  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') wipeAdminPage();
  });
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('sb-') && !e.newValue) wipeAdminPage();
  });
  $('#charge-form').addEventListener('submit', createCharge);
  $('#charge-cancel-edit').addEventListener('click', resetChargeForm);
  for (const e of $('#charge-form').querySelectorAll('input,select,textarea'))
    e.addEventListener('input', chargePreview);
  chargePreview();
  $('#copy-client-link').addEventListener('click', async () => {
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
      const form = $('#invite-form'),
        id = new URLSearchParams(query).get('empresa');
      if (id && requests.state.companies.some((c) => c.id === id && c.status !== 'inactive'))
        form.elements.clientId.value = id;
      else if (id)
        status(
          '#invite-result',
          'A empresa indicada não está disponível. Selecione uma empresa ativa.',
          true,
        );
      $('#autorizar').scrollIntoView({
        block: 'start',
      });
      (form.elements.clientId.value ? form.elements.email : form.elements.clientId).focus({
        preventScroll: true,
      });
    }
  } catch (err) {
    status('#admin-feedback', err.message, true);
    $('#admin-loading').textContent = 'Acesse primeiro o painel com sua conta administrativa.';
  }
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', init, {
    once: true,
  });
else init();
