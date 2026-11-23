import { clientDevice } from '../device/state.ts';
import { lockDevice } from '../device/feedback.ts';
import { supported } from '../device/registration.ts';
import { disconnectDevice } from '../device/notifications.ts';
import { sb } from '../api.ts';
import { clearClientScreen } from './clear.ts';
import { status } from '../view.ts';

async function logout(): Promise<void> {
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
