import { must } from '../../../shared/lib/dom.ts';
import { api } from '../api.ts';
import { requests } from '../state.ts';
import type { AdminList } from '../types.ts';
import { status } from '../ui.ts';
import { render } from './list.tsx';

async function refresh(): Promise<void> {
  const res = await api<AdminList>('list');
  requests.state = {
    companies: res.companies || [],
    grants: res.grants || [],
    notices: res.notices || [],
    attachments: res.attachments || [],
  };
  render();
  must('#admin-loading').classList.add('hidden');
  must('#admin-workspace').classList.remove('hidden');
  if (!requests.state.companies.length)
    status(
      '#admin-feedback',
      'Cadastre e salve sua primeira empresa no painel antes de publicar avisos.',
    );
}

export { refresh };
