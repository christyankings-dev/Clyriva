import { errorInfo } from '../../../shared/lib/errors.ts';
import { api } from '../api.ts';
import { refresh } from '../records/refresh.ts';
import { requests } from '../state.ts';
import type { InviteReply } from '../types.ts';
import { status } from '../ui.ts';
import { showTemporaryAccess } from './temporaryAccess.tsx';

async function invite(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  if (requests.busy) return;
  requests.busy = true;
  const form = e.target as HTMLFormElement;
  const b = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (b) b.disabled = true;
  status('#invite-result', 'Criando acesso…');
  try {
    const data = Object.fromEntries(new FormData(form));
    const value = await api<InviteReply>('invite', data);
    showTemporaryAccess({
      email: value.email,
      secret: value.temporaryPassword,
      url: value.loginUrl,
      created: value.created,
    });
    await refresh();
  } catch (err) {
    status('#invite-result', errorInfo(err).message, true);
  } finally {
    requests.busy = false;
    if (b) b.disabled = false;
  }
}

export { invite };
