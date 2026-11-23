import * as officeAgenda from '../../../shared/agenda/index.ts';
import { currentMonth } from '../lib/format.ts';
import type { PanelState } from '../types.ts';

const rotina = officeAgenda;

const demoMode = {
  demoSession: false,
};

const agendaState = {
  agendaView: rotina.agendaView(),
};

const state: PanelState = {
  page: 'dashboard',
  month: currentMonth,
  client: 'all',
  query: '',
  status: 'all',
  priority: 'all',
  detail: null,
  vaultClient: 'all',
};

export { agendaState, demoMode, rotina, state };
