import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { useStore } from '../../../../../../shared/lib/store.ts';
import { disable, enable, install, pwaBusy, pwaStatus, test } from '../../../../device/pwa.ts';
import { dialog } from '../../../../session/screen.ts';

const close = (): void => dialog.set(null);

export function PwaDialog() {
  const closeButton = useRef<HTMLButtonElement>(null);
  const status = useStore(pwaStatus);
  const busy = useStore(pwaBusy);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    return () => previous?.focus?.();
  }, []);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }
  function onBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }

  return (
    <div
      id="clyriva-pwa-overlay"
      className="clyriva-pwa-overlay"
      onClick={onBackdrop}
      onKeyDown={onKeyDown}
    >
      <section
        className="clyriva-pwa-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-modal-title"
      >
        <div className="pwa-head">
          <div className="pwa-mark">
            <img src="/icons/clyriva-192.png" alt="" width="43" height="43" /> Clyriva
          </div>
          <button
            ref={closeButton}
            type="button"
            className="pwa-close"
            id="clyriva-pwa-close"
            aria-label="Fechar"
            onClick={close}
          >
            ×
          </button>
        </div>
        <h2 id="pwa-modal-title">Seu Clyriva no celular</h2>
        <p>
          Instale o aplicativo web para entrar pelo ícone na tela inicial, usando o mesmo login
          seguro de administrador.
        </p>
        <button
          type="button"
          className="pwa-btn"
          id="clyriva-pwa-install"
          onClick={() => void install()}
        >
          Instalar Clyriva
        </button>
        <div className="pwa-section">
          <h3>Alertas no celular</h3>
          <p>
            Receba lembretes de obrigações e tributos vencidos ou próximos do vencimento. Os avisos
            não exibem nomes de clientes, valores ou CNPJs na tela bloqueada.
          </p>
          <button
            type="button"
            className="pwa-btn"
            id="clyriva-pwa-enable"
            disabled={busy.enable}
            onClick={() => void enable()}
          >
            Ativar notificações
          </button>
          <button
            type="button"
            className="pwa-btn secondary"
            id="clyriva-pwa-test"
            disabled={busy.test}
            onClick={() => void test()}
          >
            Enviar notificação de teste
          </button>
          <button
            type="button"
            className="pwa-btn secondary"
            id="clyriva-pwa-disable"
            disabled={busy.disable}
            onClick={() => void disable()}
          >
            Desativar neste celular
          </button>
        </div>
        <p className="pwa-status" id="clyriva-pwa-status" role="status" aria-live="polite">
          {status}
        </p>
        <p className="pwa-small">
          Lembretes automáticos: uma verificação diária por volta das 9h, horário de Brasília, para
          datas registradas no Clyriva. Não substituem o acompanhamento das obrigações fiscais.
        </p>
      </section>
    </div>
  );
}
