import { pageSize } from './calendar.js';
import { mountAgenda } from './schedule/view.js';
import { closeSummary, showSummary } from './summary/dialog.js';
import './schedule/clock.js';

export const agendaView = () => ({ range: 'attention', limit: pageSize });
export { mountAgenda, showSummary, closeSummary };
