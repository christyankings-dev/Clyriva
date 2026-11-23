import { $, must } from '../lib/format.ts';
import type { PageName } from '../types.ts';
import { state } from '../state/filters.ts';
import { invalidateView } from '../state/viewChanges.ts';
import { closeModal } from '../forms/dialog.tsx';

export function go(page: PageName): void {
  closeModal();
  state.page = page;
  state.query = '';
  state.status = 'all';
  state.priority = 'all';
  state.detail = null;
  must('#side').classList.remove('open');
  $('#scrim')?.remove();
  invalidateView();
  window.scrollTo(0, 0);
}
