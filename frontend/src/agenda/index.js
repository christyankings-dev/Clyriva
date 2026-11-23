import { pageSize } from './calendar.js';
import { mountAgenda } from './agenda/view.js';
import { closeSummary, showSummary } from './summary/dialog.js';
import './agenda/clock.js';

export const agendaView = () => ({ range: 'attention', limit: pageSize });
export { mountAgenda, showSummary, closeSummary };
