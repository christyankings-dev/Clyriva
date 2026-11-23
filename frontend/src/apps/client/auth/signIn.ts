import { clientActivity } from '../device/state.ts';
import { must } from '../../../shared/lib/dom.ts';
import { errorInfo } from '../../../shared/lib/errors.ts';
import { sb } from '../api.ts';
import { status } from '../view.ts';
import { refresh } from '../billing/refresh.ts';
import { clearClientScreen } from './clear.ts';

async function signIn(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  if (clientActivity.acting) return;
  clientActivity.acting = true;
  const btn = must<HTMLButtonElement>('#client-login button[type="submit"]'),
    email = must<HTMLInputElement>('#c-email').value.trim().toLowerCase();
  btn.disabled = true;
  status('#login-feedback', 'Entrando…');
  try {
    const { error } = await sb.auth.signInWithPassword({
      email,
      password: must<HTMLInputElement>('#c-password').value,
    });
    if (error) throw error;
    await refresh();
    must<HTMLInputElement>('#c-password').value = '';
    status('#login-feedback', '');
  } catch (e2) {
    const err = errorInfo(e2);
    if (err.status === 403)
      await sb.auth
        .signOut({
          scope: 'local',
        })
        .catch(() => {});
    clearClientScreen();
    must<HTMLInputElement>('#c-email').value = email;
    const invalid =
      err.code === 'invalid_credentials' || /invalid login credentials/i.test(err.message || '');
    status(
      '#login-feedback',
      invalid
        ? 'Confira o e-mail autorizado e a senha enviada pelo escritório.'
        : err.message || 'Não foi possível entrar.',
      true,
    );
  } finally {
    clientActivity.acting = false;
    btn.disabled = false;
  }
}

export { signIn };
