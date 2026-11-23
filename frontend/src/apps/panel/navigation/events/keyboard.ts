import { closeModal } from '../../forms/dialog.tsx';
import { $ } from '../../lib/format.ts';
import { busy } from '../../state/workspace.ts';

const FOCUSABLE = 'button,input,select,textarea,summary';

/** Esc fecha o diálogo; Tab fica preso dentro dele enquanto estiver aberto. */
export function bindKeyboard(): void {
  document.addEventListener('keydown', (e) => {
    if (busy) return;
    if (e.key === 'Escape') closeModal();
    const dialog = $('#modal-root [role=dialog]');
    if (!dialog || e.key !== 'Tab') return;
    const fields = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (x) => !(x as HTMLButtonElement).disabled && x.getClientRects().length,
    );
    const first = fields[0];
    const last = fields.at(-1);
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}
