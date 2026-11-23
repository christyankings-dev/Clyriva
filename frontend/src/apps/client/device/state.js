const CLIENT_SCOPE = '/cliente.html';

const clientActivity = {
  deferred: null,
  registrationPromise: null,
  loaded: false,
  acting: false,
};

const clientDevice = {
  screenVersion: 0,
  deviceVersion: 0,
  pushBusy: false,
  deviceEnabled: false,
  lastDevice: null,
};

const pushReceipt = {
  latestTest: null,
  testTimer: null,
  sessionOwner: null,
};

export { CLIENT_SCOPE, clientActivity, clientDevice, pushReceipt };
