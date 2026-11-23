import { $, api } from '../api.js';
import { requests } from '../state.js';
import { render } from './list.js';
import { status } from '../ui.js';

async function refresh() {
  const res = await api('list');
  requests.state = {
    companies: res.companies || [],
    grants: res.grants || [],
    notices: res.notices || [],
    attachments: res.attachments || [],
  };
  render();
  $('#admin-loading').classList.add('hidden');
  $('#admin-workspace').classList.remove('hidden');
  if (!requests.state.companies.length)
    status(
      '#admin-feedback',
      'Cadastre e salve sua primeira empresa no painel antes de publicar avisos.',
    );
}

export { refresh };
