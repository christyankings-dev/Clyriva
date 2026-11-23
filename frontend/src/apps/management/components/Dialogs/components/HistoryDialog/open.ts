import { sb } from '../../../../session/config.ts';
import { dialog } from '../../../../session/screen.ts';
import { state } from '../../../../session/state.ts';

/** Abre o histórico quando há sessão administrativa livre e nenhum diálogo aberto. */
export function openHistory(): void {
  if (state.mode !== 'admin' || state.saving || !sb || dialog.get() === 'history') return;
  dialog.set('history');
}
