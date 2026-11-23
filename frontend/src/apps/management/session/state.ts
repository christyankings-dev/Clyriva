import * as officeAgenda from '../../../shared/agenda/index.ts';
import type { SessionState } from '../types.ts';
import { blank, ym } from './format.ts';

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

const redirectURL = (): string => new URL(location.pathname, location.href).href;

const rotina = officeAgenda;

const state: SessionState = {
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

function discard(): void {
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

/** O número da época muda a cada saída da sessão; operações antigas deixam de valer. */
function currentEpoch(): number {
  return epoch;
}

function assertCurrent(token: number): void {
  if (token !== epoch) throw Error('A sessão mudou. Entre novamente para continuar.');
}

export {
  assertCurrent,
  currentEpoch,
  discard,
  recovery,
  recoveryRequest,
  redirectURL,
  sessionVersion,
  state,
};
