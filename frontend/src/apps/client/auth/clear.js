import { clearBilling } from '../billing/BillingOverview.jsx';
import { clientActivity, clientDevice, pushReceipt } from '../device/state.js';
import { showTest } from '../device/testReceipt.js';
import { $ } from '../api.js';
import { status, view } from '../view.js';
import { renderDevice } from '../device/feedback.js';

function clearClientScreen() {
  clientDevice.screenVersion++;
  clientDevice.deviceVersion++;
  clientActivity.loaded = false;
  clientDevice.lastDevice = null;
  clientDevice.pushBusy = false;
  if (pushReceipt.latestTest) ClyrivaPushTest.forget(pushReceipt.latestTest.id).catch(() => {});
  showTest(null);
  clearBilling();
  for (const id of ['#c-password', '#c-email']) $(id).value = '';
  $('#client-password-form').reset();
  $('#client-show-amount').checked = false;
  status('#client-feedback', '');
  status('#push-feedback', '');
  renderDevice(false, 'Conferindo este aparelho…');
  view(false);
}

export { clearClientScreen };
