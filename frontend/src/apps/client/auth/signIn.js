import { clientActivity } from '../device/state.js';
import { $, sb } from '../api.js';
import { status } from '../view.js';
import { refresh } from '../billing/refresh.js';
import { clearClientScreen } from './clear.js';

async function signIn(e) {
  e.preventDefault();
  if (clientActivity.acting) return;
  clientActivity.acting = true;
  const btn = $('#client-login button[type="submit"]'),
    email = $('#c-email').value.trim().toLowerCase();
  btn.disabled = true;
  status('#login-feedback', 'Entrando…');
  try {
    const { error } = await sb.auth.signInWithPassword({
      email,
      password: $('#c-password').value,
    });
    if (error) throw error;
    await refresh();
    $('#c-password').value = '';
    status('#login-feedback', '');
  } catch (err) {
    if (err.status === 403)
      await sb.auth
        .signOut({
          scope: 'local',
        })
        .catch(() => {});
    clearClientScreen();
    $('#c-email').value = email;
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
