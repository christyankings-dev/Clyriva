import { recoverTest, testDisplayed } from './device/testReceipt.ts';
import { sb } from './api.ts';
import { errorInfo } from '../../shared/lib/errors.ts';
import { must } from '../../shared/lib/dom.ts';
import { signIn } from './auth/signIn.ts';
import { refresh } from './billing/refresh.ts';
import { status } from './view.ts';
import type { InstallPromptEvent } from '../../shared/types/bridges.ts';
import { clientActivity, clientDevice, pushReceipt } from './device/state.ts';
import { disable, enable, test } from './device/notifications.ts';
import { install, installFeedback, updateInstall } from './device/install.ts';
import { changePassword } from './auth/password.ts';
import { clearClientScreen } from './auth/clear.ts';
import { logout } from './auth/logout.ts';
import { ready, supported } from './device/registration.ts';

async function init(): Promise<void> {
  navigator.serviceWorker?.addEventListener?.('message', testDisplayed);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) recoverTest();
  });
  window.addEventListener('pageshow', recoverTest);
  must('#client-login').addEventListener('submit', signIn);
  must('#client-refresh').addEventListener('click', () =>
    refresh().catch((e: unknown) => status('#client-feedback', errorInfo(e).message, true)),
  );
  must('#client-show-amount').addEventListener('change', () =>
    status(
      '#push-feedback',
      clientDevice.deviceEnabled
        ? 'Toque em “Salvar preferência” para aplicar a alteração.'
        : 'A preferência será salva quando você ativar as notificações.',
    ),
  );
  must('#client-push-enable').addEventListener('click', enable);
  must('#client-push-test').addEventListener('click', test);
  must('#client-push-disable').addEventListener('click', disable);
  for (const button of document.querySelectorAll('[data-client-install]'))
    button.addEventListener('click', install);
  updateInstall();
  window.addEventListener('appinstalled', () => {
    clientActivity.deferred = null;
    installFeedback('Abra o ícone Clyriva Clientes na tela inicial.');
    updateInstall();
  });
  must('#client-password-form').addEventListener('submit', changePassword);
  must('#client-notice-filter').addEventListener('change', () =>
    refresh().catch((e: unknown) => status('#client-feedback', errorInfo(e).message, true)),
  );
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') clearClientScreen();
    const next = session?.user?.id || null;
    if (next && pushReceipt.sessionOwner && pushReceipt.sessionOwner !== next) {
      clearClientScreen();
      const version = clientDevice.screenVersion;
      setTimeout(() => {
        if (version === clientDevice.screenVersion)
          refresh().catch((e: unknown) => {
            if (version === clientDevice.screenVersion)
              status('#login-feedback', errorInfo(e).message, true);
          });
      }, 0);
    }
    pushReceipt.sessionOwner = next;
  });
  must('#client-logout').addEventListener('click', logout);
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    clientActivity.deferred = e as InstallPromptEvent;
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
        const { message } = errorInfo(e);
        status('#login-feedback', message, true);
        if (message.includes('Nenhuma empresa'))
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
