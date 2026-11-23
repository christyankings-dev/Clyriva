import { bindClicks } from './clicks.ts';
import { bindFilters } from './filters.ts';
import { bindKeyboard } from './keyboard.ts';
import { bindRecordForms } from './recordForms.ts';
import { bindShell } from './shell.ts';
import { bindSubmits } from './submits.ts';

/** Liga os ouvintes delegados do painel. Chamar uma vez, depois de a casca estar no DOM. */
export function bindEvents(): void {
  bindClicks();
  bindSubmits();
  bindRecordForms();
  bindFilters();
  bindKeyboard();
  bindShell();
}
