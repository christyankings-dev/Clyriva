import * as officeAgenda from '../../../shared/agenda/index.js';
import { currentMonth } from '../lib/format.js';

const rotina = officeAgenda;

const demoMode = {
  demoSession: false,
};

const agendaState = {
  agendaView: rotina.agendaView(),
};

const state = {
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
