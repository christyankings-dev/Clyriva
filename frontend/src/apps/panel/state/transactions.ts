import { must } from '../lib/format.ts';
import { errorInfo } from '../../../shared/lib/errors.ts';
import type { VaultBlob } from '../../../shared/domain/types.ts';
import { busy, local, panelWorkspace, persist, setBusy } from './workspace.ts';
import { download } from '../lib/download.ts';
import { KEY, VAULT_KEY } from './storage.ts';
import { toast } from '../lib/feedback.ts';
import { state } from './filters.ts';
import { forgetVault } from '../vault/session.ts';
import { indexState } from './selectors.ts';
import { invalidateView } from './viewChanges.ts';

function showStorageError(err: unknown): void {
  const host = must('#panel-status');
  host.hidden = false;
  host.replaceChildren();
  const message = document.createElement('p');
  message.textContent =
    'Não foi possível abrir a carteira. ' +
    (errorInfo(err).message || 'Armazenamento indisponível.');
  host.append(message);
  if (local) {
    const button = document.createElement('button');
    button.className = 'btn';
    button.textContent = 'Exportar conteúdo original para recuperação';
    button.onclick = () => {
      try {
        download(
          'clyriva-recuperacao.json',
          JSON.stringify(
            {
              workspaceOriginal: localStorage.getItem(KEY),
              cofreOriginal: localStorage.getItem(VAULT_KEY),
            },
            null,
            2,
          ),
          'application/json',
        );
      } catch {
        toast('O navegador bloqueou o acesso aos dados.', true);
      }
    };
    host.append(button);
  } else {
    const link = document.createElement('a');
    link.href = 'index.html';
    link.target = '_top';
    link.textContent = 'Abrir o login';
    host.append(link);
  }
  must('.shell').hidden = true;
}

interface MutateOptions {
  /** Novo envelope do cofre; presente = o cofre é regravado e a sessão dele encerrada. */
  vault?: VaultBlob | null;
}

async function mutate(
  action: () => void,
  msg = 'Informações salvas.',
  options: MutateOptions = {},
): Promise<boolean> {
  if (busy || !panelWorkspace.initialized) return false;
  setBusy(true);
  const previous = structuredClone(panelWorkspace.data),
    previousState = {
      ...state,
    };
  try {
    action();
    const blob =
      Object.hasOwn(options, 'vault') && options.vault !== undefined
        ? options.vault
        : panelWorkspace.encrypted;
    await persist(panelWorkspace.data, blob);
    if (Object.hasOwn(options, 'vault')) forgetVault();
  } catch (err) {
    panelWorkspace.data = previous;
    Object.assign(state, previousState);
    indexState.indexesDirty = true;
    invalidateView();
    toast(
      'Alteração não salva. ' +
        (errorInfo(err).message || 'Verifique a conexão ou o espaço disponível.'),
      true,
    );
    return false;
  } finally {
    setBusy(false);
  }
  indexState.indexesDirty = true;
  invalidateView();
  toast(msg);
  return true;
}

export { mutate, showStorageError };
