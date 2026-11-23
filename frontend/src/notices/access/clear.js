import { requests } from '../state.js';
import { $ } from '../api.js';

function wipeAdminPage() {
  requests.state = {
    companies: [],
    grants: [],
    notices: [],
    attachments: [],
  };
  const area = $('#admin-workspace');
  if (area) area.classList.add('hidden');
  const loading = $('#admin-loading');
  if (loading) {
    loading.classList.remove('hidden');
    loading.textContent = 'Sessão encerrada. Entre novamente pelo painel administrativo.';
  }
  for (const id of ['#invite-result', '#access-list', '#notices-list', '#billing-summary']) {
    const slot = $(id);
    if (slot) slot.replaceChildren();
  }
  for (const id of ['#invite-form', '#notice-form', '#charge-form']) {
    const form = $(id);
    if (form) form.reset();
  }
}

export { wipeAdminPage };
