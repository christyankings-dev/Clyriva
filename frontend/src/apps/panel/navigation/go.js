import { $ } from '../lib/format.js';
import { state } from '../state/filters.js';
import { invalidateView } from '../state/viewChanges.js';
import { closeModal } from '../forms/dialog.js';

export function go(page) {
  closeModal();
  state.page = page;
  state.query = '';
  state.status = 'all';
  state.priority = 'all';
  state.detail = null;
  $('#side').classList.remove('open');
  $('#scrim')?.remove();
  invalidateView();
  window.scrollTo(0, 0);
}
