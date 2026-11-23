import { pageSize } from './calendar.ts';
import { mountAgenda } from './schedule/view.ts';
import { closeSummary, showSummary } from './summary/dialog.ts';
import './schedule/clock.ts';

export const agendaView = () => ({ range: 'attention', limit: pageSize });
export { mountAgenda, showSummary, closeSummary };
