import { useStore } from '../../../../shared/lib/store.ts';
import { signout } from '../../auth/router.ts';
import { dialog, showAdmin, syncStatus } from '../../session/screen.ts';
import { state } from '../../session/state.ts';
import { openHistory } from '../Dialogs/components/HistoryDialog/open.ts';
import { PanelFrame } from './components/PanelFrame/index.tsx';

export function AdminShell() {
  const sync = useStore(syncStatus);
  return (
    <div className="admin-app">
      <header className="header admin-top">
        <div className="row" style={{ gap: '10px' }}>
          <span className="brand-logo" style={{ height: '32px', width: '32px', fontSize: '21px' }}>
            C
          </span>
          <div>
            <strong>Clyriva · Gestão privada</strong>
            <small>{state.user?.email || 'Administrador'}</small>
          </div>
        </div>
        <nav className="actions">
          <button
            className="button sm"
            id="adm-panel"
            disabled={sync.saving}
            onClick={() => {
              if (!state.saving) {
                state.adminTab = 'panel';
                showAdmin();
              }
            }}
          >
            ▦ Painel completo
          </button>
          <button
            className="button secondary sm"
            id="history-btn"
            disabled={sync.saving}
            onClick={openHistory}
          >
            Histórico
          </button>
          <button
            className="button secondary sm"
            id="pwa-install-admin"
            type="button"
            onClick={() => window.ClyrivaPwa?.open()}
          >
            Instalar app / Alertas
          </button>
          <button
            className="button secondary sm"
            id="admin-client-notices"
            type="button"
            onClick={() => window.open('/avisos-admin.html', '_blank', 'noopener,noreferrer')}
          >
            Avisos para clientes
          </button>
        </nav>
        <div className="hdr-right">
          <span id="sync-state" className={sync.bad ? 'pill rose' : 'pill'}>
            {sync.text}
          </span>
          <button
            className="button secondary sm"
            id="change-password"
            onClick={() => dialog.set('password')}
          >
            Alterar senha
          </button>
          <button
            className="button secondary sm"
            id="signout"
            disabled={sync.saving}
            onClick={() => void signout()}
          >
            Sair
          </button>
        </div>
      </header>
      <div id="admin-body">
        <PanelFrame />
      </div>
    </div>
  );
}
