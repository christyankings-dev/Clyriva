import { esc } from '../session/format.js';
import { state } from '../session/state.js';
import { $, root } from '../session/config.js';
import { showHistory } from '../workspace/history.js';
import { signout } from '../auth/router.js';
import { changePassword } from '../auth/forms.js';

function adminShell() {
  return `<div class="admin-app"><header class="header admin-top"><div class="row" style="gap:10px"><span class="brand-logo" style="height:32px;width:32px;font-size:21px">C</span><div><strong>Clyriva · Gestão privada</strong><small>${esc(state.user?.email || 'Administrador')}</small></div></div><nav class="actions"><button class="button sm" id="adm-panel">▦ Painel completo</button><button class="button secondary sm" id="history-btn">Histórico</button><button class="button secondary sm" id="pwa-install-admin" type="button">Instalar app / Alertas</button><button class="button secondary sm" id="admin-client-notices" type="button">Avisos para clientes</button></nav><div class="hdr-right"><span id="sync-state" class="pill">Conectado</span><button class="button secondary sm" id="change-password">Alterar senha</button><button class="button secondary sm" id="signout">Sair</button></div></header><div id="admin-body"></div></div>`;
}

function renderAdmin() {
  root.innerHTML = adminShell();
  $('#adm-panel').onclick = () => {
    if (!state.saving) {
      state.adminTab = 'panel';
      renderAdmin();
    }
  };
  $('#history-btn').onclick = showHistory;
  $('#pwa-install-admin').onclick = () => window.ClyrivaPwa?.open();
  $('#admin-client-notices').onclick = () => {
    window.open('/avisos-admin.html', '_blank', 'noopener,noreferrer');
  };
  $('#signout').onclick = signout;
  $('#change-password').onclick = changePassword;
  state.frame = null;
  state.adminTab = 'panel';
  const host = $('#admin-body');
  host.innerHTML =
    '<div class="admin-info">Carteira privada. Seus registros são sincronizados com o banco de dados.</div>';
  const frame = document.createElement('iframe');
  frame.id = 'admin-iframe';
  frame.className = 'admin-view';
  frame.title = 'Painel administrativo Clyriva';
  state.frame = frame;
  frame.src = 'admin.html';
  host.append(frame);
}

export { renderAdmin };
