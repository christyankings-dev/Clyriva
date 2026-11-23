import { createPortal } from 'react-dom';
import { useStore } from '../../../../shared/lib/store.ts';
import { open, triggerLabel } from '../../device/pwa.ts';

/** Botão flutuante para instalar o app ou abrir os alertas (visível em todas as telas). */
export function PwaTrigger() {
  const label = useStore(triggerLabel);
  return createPortal(
    <button id="clyriva-pwa-trigger" className="clyriva-pwa-trigger" type="button" onClick={open}>
      {label}
    </button>,
    document.body,
  );
}
