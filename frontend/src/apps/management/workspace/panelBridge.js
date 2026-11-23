import { assertCurrent, epoch, state } from '../session/state.js';
import { $, core, sb } from '../session/config.js';

function activePanel(child) {
  return (
    ['admin', 'demo-admin'].includes(state.mode) &&
    state.adminTab === 'panel' &&
    state.frame?.contentWindow === child
  );
}

function syncLabel(text, bad = false) {
  const el = $('#sync-state');
  if (el) {
    el.textContent = text;
    el.className = 'pill ' + (bad ? 'rose' : '');
  }
  for (const id of ['adm-panel', 'history-btn', 'signout']) {
    const b = $('#' + id);
    if (b) b.disabled = state.saving;
  }
}

Object.defineProperty(window, 'ClyrivaPanelHost', {
  value: Object.freeze({
    async token(child) {
      if (!activePanel(child) || !sb) return null;
      const { data, error } = await sb.auth.getSession();
      if (error || !data?.session?.access_token) return null;
      return data.session.access_token;
    },
    open(child) {
      if (!activePanel(child)) return null;
      return structuredClone({
        data: state.adminPayload,
        vault: state.vault,
        demo: false,
      });
    },
    async commit(child, payload, vault) {
      if (!activePanel(child) || state.saving)
        throw Error('Painel indisponível ou outra operação em andamento.');
      const data = core.workspace(structuredClone(payload)),
        blob = core.vault(structuredClone(vault)),
        token = epoch;
      const demo = false;
      state.saving = true;
      syncLabel('Salvando…');
      let saved = false;
      try {
        if (!demo) {
          const res = await sb.rpc('clyriva_commit', {
            p_expected: state.revision,
            p_workspace: data,
            p_vault: blob,
          });
          assertCurrent(token);
          if (res.error) throw Error(res.error.message);
          if (!Number.isSafeInteger(res.data) || res.data <= state.revision)
            throw Error('O banco não confirmou a revisão. Recarregue para conferir.');
          state.revision = res.data;
        }
        state.adminPayload = data;
        state.vault = blob;
        saved = true;
      } finally {
        if (token === epoch) {
          state.saving = false;
          syncLabel(saved ? (demo ? 'DEMONSTRAÇÃO' : 'Sincronizado') : 'Falha na gravação', !saved);
        }
      }
    },
  }),
});
