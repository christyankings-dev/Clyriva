import { importJson } from '../../backup/workspaceBackup.ts';
import { $, must } from '../../lib/format.ts';

/** Menu lateral em telas pequenas e seletor de arquivo da importação. */
export function bindShell(): void {
  must('#hamb').addEventListener('click', () => {
    const side = must('#side');
    const isOpen = side.classList.toggle('open');
    if (isOpen) {
      const cover = document.createElement('div');
      cover.id = 'scrim';
      cover.className = 'scrim show';
      cover.onclick = () => {
        side.classList.remove('open');
        cover.remove();
      };
      document.body.append(cover);
    } else $('#scrim')?.remove();
  });

  const picker = must<HTMLInputElement>('#import-file');
  picker.addEventListener('change', () => {
    void importJson(picker.files?.[0]);
    picker.value = '';
  });
}
