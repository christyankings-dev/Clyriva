import type { PanelHost } from '../../../shared/types/bridges.ts';
import type { VaultBlob, Workspace } from '../../../shared/domain/types.ts';
import { core, sb } from '../session/config.ts';
import { syncLabel } from '../session/screen.ts';
import { assertCurrent, currentEpoch, state } from '../session/state.ts';

function activePanel(child: Window): boolean {
  return (
    ['admin', 'demo-admin'].includes(state.mode) &&
    state.adminTab === 'panel' &&
    state.frame?.contentWindow === child
  );
}

const host: PanelHost = {
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
  async commit(child: Window, payload: Workspace, vault: VaultBlob | null) {
    if (!activePanel(child) || state.saving || !sb)
      throw Error('Painel indisponível ou outra operação em andamento.');
    const data = core.workspace(structuredClone(payload)),
      blob = core.vault(structuredClone(vault)),
      token = currentEpoch();
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
        const revision: unknown = res.data;
        if (!Number.isSafeInteger(revision) || (revision as number) <= state.revision)
          throw Error('O banco não confirmou a revisão. Recarregue para conferir.');
        state.revision = revision as number;
      }
      state.adminPayload = data;
      state.vault = blob;
      saved = true;
    } finally {
      if (token === currentEpoch()) {
        state.saving = false;
        syncLabel(saved ? (demo ? 'DEMONSTRAÇÃO' : 'Sincronizado') : 'Falha na gravação', !saved);
      }
    }
  },
};

Object.defineProperty(window, 'ClyrivaPanelHost', { value: Object.freeze(host) });
