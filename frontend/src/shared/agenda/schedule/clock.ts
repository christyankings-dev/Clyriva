import { localDate } from '../calendar.ts';
import { closeSummary } from '../summary/dialog.ts';

let dateTimer: ReturnType<typeof setTimeout> | undefined,
  lastDay = localDate();

function refreshDate(): void {
  clearTimeout(dateTimer);
  if (document.hidden) return;
  const day = localDate();
  if (day !== lastDay)
    document.querySelector('.routine-agenda')?.dispatchEvent(new Event('routine-day-change'));
  lastDay = day;
  dateTimer = setTimeout(refreshDate, 60000);
}

document.addEventListener('visibilitychange', refreshDate);

window.addEventListener('pageshow', refreshDate);

window.addEventListener('pagehide', () => {
  clearTimeout(dateTimer);
  closeSummary();
});
