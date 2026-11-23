import { useState, type CSSProperties } from 'react';
import { errorInfo } from '../../../../shared/lib/errors.ts';
import { status } from '../../ui.ts';

interface ActionButtonProps {
  label: string;
  /** Pergunta de confirmação exibida antes de executar. */
  confirmText?: string;
  style?: CSSProperties;
  onRun: () => Promise<void>;
}

/** Botão que confirma, bloqueia durante a operação e mostra qualquer falha no aviso da página. */
export function ActionButton({ label, confirmText, style, onRun }: ActionButtonProps) {
  const [busy, setBusy] = useState(false);
  async function run() {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    try {
      await onRun();
    } catch (e) {
      status('#admin-feedback', errorInfo(e).message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" className="btn" style={style} disabled={busy} onClick={run}>
      {label}
    </button>
  );
}
