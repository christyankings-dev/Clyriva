import { recoverTest, testDisplayed } from './device/testReceipt.js';
import { $, sb } from './api.js';
import { signIn } from './auth/signIn.js';
import { refresh } from './billing/refresh.js';
import { status } from './view.js';
import { clientActivity, clientDevice, pushReceipt } from './device/state.js';
import { disable, enable, test } from './device/notifications.js';
import { install, installFeedback, updateInstall } from './device/install.js';
import { changePassword } from './auth/password.js';
import { clearClientScreen } from './auth/clear.js';
import { logout } from './auth/logout.js';
import { ready, supported } from './device/registration.js';

async function init() {
  navigator.serviceWorker?.addEventListener?.('message', testDisplayed);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) recoverTest();
  });
  window.addEventListener('pageshow', recoverTest);
  $('#client-login').addEventListener('submit', signIn);
  $('#client-refresh').addEventListener('click', () =>
    refresh().catch((e) => status('#client-feedback', e.message, true)),
  );
  $('#client-show-amount').addEventListener('change', () =>
    status(
      '#push-feedback',
      clientDevice.deviceEnabled
        ? 'Toque em “Salvar preferência” para aplicar a alteração.'
        : 'A preferência será salva quando você ativar as notificações.',
    ),
  );
  $('#client-push-enable').addEventListener('click', enable);
  $('#client-push-test').addEventListener('click', test);
  $('#client-push-disable').addEventListener('click', disable);
  for (const button of document.querySelectorAll('[data-client-install]'))
    button.addEventListener('click', install);
  updateInstall();
  window.addEventListener('appinstalled', () => {
    clientActivity.deferred = null;
    installFeedback('Abra o ícone Clyriva Clientes na tela inicial.');
    updateInstall();
  });
  $('#client-password-form').addEventListener('submit', changePassword);
  $('#client-notice-filter').addEventListener('change', () =>
    refresh().catch((e) => status('#client-feedback', e.message, true)),
  );
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') clearClientScreen();
    const next = session?.user?.id || null;
    if (next && pushReceipt.sessionOwner && pushReceipt.sessionOwner !== next) {
      clearClientScreen();
      const version = clientDevice.screenVersion;
      setTimeout(() => {
        if (version === clientDevice.screenVersion)
          refresh().catch((e) => {
            if (version === clientDevice.screenVersion) status('#login-feedback', e.message, true);
          });
      }, 0);
    }
    pushReceipt.sessionOwner = next;
  });
  $('#client-logout').addEventListener('click', logout);
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    clientActivity.deferred = e;
  });
  if (supported()) ready().catch(() => {});
  try {
    const {
      data: { session },
    } = await sb.auth.getSession();
    if (session) {
      try {
        await refresh();
      } catch (e) {
        status('#login-feedback', e.message, true);
        if ((e.message || '').includes('Nenhuma empresa'))
          await sb.auth.signOut({
            scope: 'local',
          });
      }
    }
  } catch (e) {
    status('#login-feedback', 'Entre com seu e-mail e senha.', true);
  }
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', init, {
    once: true,
  });
else init();
