import type { InstallPromptEvent, PushTestRow } from '../../../shared/types/bridges.ts';

const CLIENT_SCOPE = '/cliente.html';

const clientActivity: {
  deferred: InstallPromptEvent | null;
  registrationPromise: Promise<ServiceWorkerRegistration> | null;
  loaded: boolean;
  acting: boolean;
} = {
  deferred: null,
  registrationPromise: null,
  loaded: false,
  acting: false,
};

const clientDevice: {
  screenVersion: number;
  deviceVersion: number;
  pushBusy: boolean;
  deviceEnabled: boolean;
  lastDevice: PushSubscription | null;
} = {
  screenVersion: 0,
  deviceVersion: 0,
  pushBusy: false,
  deviceEnabled: false,
  lastDevice: null,
};

const pushReceipt: {
  latestTest: PushTestRow | null;
  testTimer: ReturnType<typeof setTimeout> | undefined;
  sessionOwner: string | null;
} = {
  latestTest: null,
  testTimer: undefined,
  sessionOwner: null,
};

export { CLIENT_SCOPE, clientActivity, clientDevice, pushReceipt };
