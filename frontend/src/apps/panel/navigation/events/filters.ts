import { currentMonth } from '../../lib/format.ts';
import { agendaState, rotina, state } from '../../state/filters.ts';
import { invalidateView } from '../../state/viewChanges.ts';
import { vaultSession } from '../../vault/session.ts';
import { $ } from '../../lib/format.ts';
import { targetOf } from './target.ts';

/** Filtros do topo e das listas; cada alteração redesenha a página atual. */
function bindChangeFilters(): void {
  document.addEventListener('change', (e) => {
    const target = targetOf(e);
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    if (target.id === 'vault-client-filter') {
      vaultSession.vaultSelectedClient = target.value;
      invalidateView();
    }
    if (target.id === 'month') {
      state.month = target.value || currentMonth;
      invalidateView();
    }
    if (target.id === 'client-filter') {
      agendaState.agendaView = rotina.agendaView();
      state.client = target.value;
      if (state.page === 'detail') {
        state.detail = state.client;
        if (state.client === 'all') state.page = 'clients';
      }
      invalidateView();
    }
    if (target.id === 'status-filter') {
      state.status = target.value;
      invalidateView();
    }
    if (target.id === 'priority-filter') {
      state.priority = target.value;
      invalidateView();
    }
  });
}

/** Busca global (Enter abre a lista de clientes) e busca da lista (filtra enquanto digita). */
function bindSearch(): void {
  document.addEventListener('keydown', (e) => {
    const target = targetOf(e);
    if (target instanceof HTMLInputElement && target.id === 'global-search' && e.key === 'Enter') {
      e.preventDefault();
      state.client = 'all';
      state.page = 'clients';
      state.query = target.value.trim();
      state.status = 'all';
      state.priority = 'all';
      invalidateView();
      $<HTMLInputElement>('#search')?.focus();
    }
  });

  document.addEventListener('input', (e) => {
    const target = targetOf(e);
    if (!(target instanceof HTMLInputElement) || target.id !== 'search') return;
    const pos = target.selectionStart ?? target.value.length;
    state.query = target.value;
    invalidateView();
    // A lista é redesenhada; o foco e o cursor voltam para o campo novo.
    const box = $<HTMLInputElement>('#search');
    if (box) {
      box.focus();
      box.setSelectionRange(pos, pos);
    }
  });
}

export function bindFilters(): void {
  bindChangeFilters();
  bindSearch();
}
