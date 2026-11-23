import { clientDevice } from '../device/state.js';
import { lockDevice } from '../device/feedback.js';
import { supported } from '../device/registration.js';
import { disconnectDevice } from '../device/notifications.js';
import { sb } from '../api.js';
import { clearClientScreen } from './clear.js';
import { status } from '../view.js';

async function logout() {
  if (clientDevice.pushBusy) return;
  lockDevice(true);
  clientDevice.deviceVersion++;
  let warning = '';
  if (supported()) {
    try {
      warning = await disconnectDevice();
    } catch {
      warning =
        'Não foi possível conferir as notificações. Verifique a permissão nas configurações do aparelho.';
    }
  }
  try {
    await sb.auth.signOut({
      scope: 'local',
    });
  } finally {
    clearClientScreen();
    status('#login-feedback', warning || 'Sessão encerrada.', !!warning);
  }
}

export { logout };
