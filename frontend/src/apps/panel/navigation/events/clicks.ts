import { closeModal } from '../../forms/dialog.tsx';
import type { PageName } from '../../types.ts';
import { handleAction } from '../actions.ts';
import { go } from '../go.ts';
import { targetOf } from './target.ts';

/** Cliques delegados: botões `data-action`, menu `data-page` e fundo do diálogo. */
export function bindClicks(): void {
  document.addEventListener('click', (e) => {
    const target = targetOf(e);
    if (!target) return;
    const actionEl = target.closest<HTMLElement>('[data-action]');
    if (actionEl) {
      e.preventDefault();
      handleAction(actionEl.dataset.action ?? '', actionEl);
      return;
    }
    const nav = target.closest<HTMLElement>('[data-page]');
    if (nav) {
      e.preventDefault();
      go(nav.dataset.page as PageName);
      return;
    }
    if (target.id === 'modal-backdrop') closeModal();
  });
}
