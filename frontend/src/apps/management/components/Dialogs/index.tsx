import { createPortal } from 'react-dom';
import { useStore } from '../../../../shared/lib/store.ts';
import { dialog } from '../../session/screen.ts';
import { HistoryDialog } from './components/HistoryDialog/index.tsx';
import { PasswordDialog } from './components/PasswordDialog/index.tsx';
import { PwaDialog } from './components/PwaDialog/index.tsx';

/** Diálogos sobrepostos à página (ficam no <body>, acima de qualquer tela). */
export function Dialogs() {
  const kind = useStore(dialog);
  if (!kind) return null;
  return createPortal(
    kind === 'history' ? (
      <HistoryDialog />
    ) : kind === 'password' ? (
      <PasswordDialog />
    ) : (
      <PwaDialog />
    ),
    document.body,
  );
}
