import { clientDevice } from './state.js';
import { $ } from '../api.js';

function renderDevice(enabled, message) {
  clientDevice.deviceEnabled = enabled;
  $('#device-status').textContent = message;
  $('#client-push-test').disabled = !enabled || clientDevice.pushBusy;
  $('#client-push-disable').disabled = !enabled || clientDevice.pushBusy;
  $('#client-push-enable').disabled = clientDevice.pushBusy;
  $('#client-push-enable').textContent = enabled ? 'Salvar preferência' : 'Ativar notificações';
  $('#client-logout').disabled = clientDevice.pushBusy;
}

function lockDevice(busy) {
  clientDevice.pushBusy = busy;
  renderDevice(clientDevice.deviceEnabled, $('#device-status').textContent);
}

export { lockDevice, renderDevice };
