import { $ } from '../../../shared/lib/dom.ts';
import { clearLists } from '../records/list.tsx';
import { requests } from '../state.ts';

function wipeAdminPage(): void {
  requests.state = {
    companies: [],
    grants: [],
    notices: [],
    attachments: [],
  };
  $('#admin-workspace')?.classList.add('hidden');
  const loading = $('#admin-loading');
  if (loading) {
    loading.classList.remove('hidden');
    loading.textContent = 'Sessão encerrada. Entre novamente pelo painel administrativo.';
  }
  clearLists();
  $('#invite-result')?.replaceChildren();
  for (const id of ['#invite-form', '#notice-form', '#charge-form']) {
    $<HTMLFormElement>(id)?.reset();
  }
}

export { wipeAdminPage };
