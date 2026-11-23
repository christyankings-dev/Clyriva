import { must } from '../../../shared/lib/dom.ts';
import { clientDevice } from './state.ts';

function renderDevice(enabled: boolean, message: string): void {
  clientDevice.deviceEnabled = enabled;
  must('#device-status').textContent = message;
  must<HTMLButtonElement>('#client-push-test').disabled = !enabled || clientDevice.pushBusy;
  must<HTMLButtonElement>('#client-push-disable').disabled = !enabled || clientDevice.pushBusy;
  must<HTMLButtonElement>('#client-push-enable').disabled = clientDevice.pushBusy;
  must('#client-push-enable').textContent = enabled ? 'Salvar preferência' : 'Ativar notificações';
  must<HTMLButtonElement>('#client-logout').disabled = clientDevice.pushBusy;
}

function lockDevice(busy: boolean): void {
  clientDevice.pushBusy = busy;
  renderDevice(clientDevice.deviceEnabled, must('#device-status').textContent ?? '');
}

export { lockDevice, renderDevice };
