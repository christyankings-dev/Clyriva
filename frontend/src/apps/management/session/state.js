import * as officeAgenda from '../../../shared/agenda/index.js';
import { blank, ym } from './format.js';

let epoch = 0;

const sessionVersion = {
  routeGeneration: 0,
};

const recoveryRequest = {
  awaitingRecovery:
    new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery' ||
    new URLSearchParams(location.search).has('recuperar'),
};

const recovery = {
  recovering: false,
};

const redirectURL = () => new URL(location.pathname, location.href).href;

const rotina = officeAgenda;

const state = {
  mode: 'login',
  user: null,
  adminPayload: blank(),
  vault: null,
  revision: 0,
  clientViews: [],
  access: [],
  month: ym(),
  selectedClient: null,
  adminTab: 'panel',
  frame: null,
  saving: false,
  authBusy: false,
};

function discard() {
  rotina.closeSummary();
  epoch++;
  sessionVersion.routeGeneration++;
  Object.assign(state, {
    mode: 'login',
    user: null,
    adminPayload: blank(),
    vault: null,
    revision: 0,
    clientViews: [],
    access: [],
    month: ym(),
    selectedClient: null,
    adminTab: 'panel',
    frame: null,
    saving: false,
  });
}

function assertCurrent(token) {
  if (token !== epoch) throw Error('A sessão mudou. Entre novamente para continuar.');
}

export {
  assertCurrent,
  discard,
  epoch,
  recovery,
  recoveryRequest,
  redirectURL,
  sessionVersion,
  state,
};
