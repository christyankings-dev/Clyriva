import { clearBilling } from '../components/BillingOverview/index.tsx';
import { clientActivity, clientDevice, pushReceipt } from '../device/state.ts';
import { showTest } from '../device/testReceipt.ts';
import { must } from '../../../shared/lib/dom.ts';
import { status, view } from '../view.ts';
import { renderDevice } from '../device/feedback.ts';

function clearClientScreen(): void {
  clientDevice.screenVersion++;
  clientDevice.deviceVersion++;
  clientActivity.loaded = false;
  clientDevice.lastDevice = null;
  clientDevice.pushBusy = false;
  if (pushReceipt.latestTest) ClyrivaPushTest.forget(pushReceipt.latestTest.id).catch(() => {});
  showTest(null);
  clearBilling();
  for (const id of ['#c-password', '#c-email']) must<HTMLInputElement>(id).value = '';
  must<HTMLFormElement>('#client-password-form').reset();
  must<HTMLInputElement>('#client-show-amount').checked = false;
  status('#client-feedback', '');
  status('#push-feedback', '');
  renderDevice(false, 'Conferindo este aparelho…');
  view(false);
}

export { clearClientScreen };
