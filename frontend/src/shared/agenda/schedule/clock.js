import { localDate } from '../calendar.js';
import { closeSummary } from '../summary/dialog.js';

let dateTimer,
  lastDay = localDate();

function refreshDate() {
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
