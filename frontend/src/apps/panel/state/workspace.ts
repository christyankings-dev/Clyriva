import * as workspaceRules from '../../../shared/domain/workspace.ts';
import type { VaultBlob, Workspace } from '../../../shared/domain/types.ts';
import type { PanelHost } from '../../../shared/types/bridges.ts';
import { KEY, VAULT_KEY } from './storage.ts';

const core = workspaceRules;

const local = document.body.dataset.mode === 'local';

let busy = false;

const panelWorkspace: {
  data: Workspace;
  encrypted: VaultBlob | null;
  initialized: boolean;
} = {
  data: core.empty(),
  encrypted: null,
  initialized: false,
};

let expectedLocal: string | null = null;

let expectedLegacyVault: string | null = null;

const panelConnection: { bridge: PanelHost | null | undefined } = {
  bridge: null,
};

const readVaultBlob = (): VaultBlob | null => panelWorkspace.encrypted;

function unpackLocal(): void {
  expectedLocal = localStorage.getItem(KEY);
  const raw: Record<string, unknown> =
    expectedLocal === null ? core.empty() : JSON.parse(expectedLocal);
  const next = core.workspace(raw);
  expectedLegacyVault = localStorage.getItem(VAULT_KEY);
  const cipher = Object.hasOwn(raw, 'cofreCriptografado')
    ? raw.cofreCriptografado
    : JSON.parse(expectedLegacyVault || 'null');
  panelWorkspace.encrypted = core.vault(cipher);
  panelWorkspace.data = next;
}

async function persist(nextData: Workspace, nextVault: VaultBlob | null): Promise<void> {
  if (!panelWorkspace.initialized) throw Error('O painel ainda não carregou os dados.');
  if (!local) {
    if (!panelConnection.bridge) throw Error('Sessão administrativa indisponível.');
    await panelConnection.bridge.commit(window, nextData, nextVault);
    panelWorkspace.encrypted = nextVault;
    return;
  }
  const write = () => {
    if (
      localStorage.getItem(KEY) !== expectedLocal ||
      localStorage.getItem(VAULT_KEY) !== expectedLegacyVault
    )
      throw Error(
        'A carteira mudou em outra aba. Reabra a página para carregar a versão mais recente.',
      );
    const serialized = JSON.stringify({
      ...nextData,
      cofreCriptografado: nextVault,
    });
    localStorage.setItem(KEY, serialized);
    expectedLocal = serialized;
    panelWorkspace.encrypted = nextVault;
    // O cofre legado só é removido depois da escrita atômica do novo envelope.
    if (expectedLegacyVault !== null) {
      try {
        localStorage.removeItem(VAULT_KEY);
        expectedLegacyVault = null;
      } catch {}
    }
  };
  if (navigator.locks) await navigator.locks.request('clyriva-local-v1', write);
  else write();
}

function setBusy(value: boolean): void {
  busy = value;
  document.body.setAttribute('aria-busy', String(value));
  for (const el of document.querySelectorAll<HTMLElement>('.shell, #modal-root')) el.inert = value;
}

window.addEventListener('beforeunload', (event) => {
  if (busy) {
    event.preventDefault();
    event.returnValue = '';
  }
});

export {
  busy,
  core,
  local,
  panelConnection,
  panelWorkspace,
  persist,
  readVaultBlob,
  setBusy,
  unpackLocal,
};
