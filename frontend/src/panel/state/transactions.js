import { $ } from '../shared/format.js';
import { busy, local, panelWorkspace, persist, setBusy } from './workspace.js';
import { download } from '../shared/download.js';
import { KEY, VAULT_KEY } from './storage.js';
import { toast } from '../shared/feedback.js';
import { state } from './filters.js';
import { forgetVault } from '../vault/session.js';
import { indexState } from './selectors.js';
import { invalidateView } from '../state/viewChanges.js';

function showStorageError(err) {
  const host = $('#panel-status');
  host.hidden = false;
  host.replaceChildren();
  const message = document.createElement('p');
  message.textContent =
    'Não foi possível abrir a carteira. ' + (err.message || 'Armazenamento indisponível.');
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
  document.querySelector('.shell').hidden = true;
}

async function mutate(action, msg = 'Informações salvas.', options = {}) {
  if (busy || !panelWorkspace.initialized) return false;
  setBusy(true);
  const previous = structuredClone(panelWorkspace.data),
    previousState = {
      ...state,
    };
  try {
    action();
    const blob = Object.hasOwn(options, 'vault') ? options.vault : panelWorkspace.encrypted;
    await persist(panelWorkspace.data, blob);
    if (Object.hasOwn(options, 'vault')) forgetVault();
  } catch (err) {
    panelWorkspace.data = previous;
    Object.assign(state, previousState);
    indexState.indexesDirty = true;
    invalidateView();
    toast(
      'Alteração não salva. ' + (err.message || 'Verifique a conexão ou o espaço disponível.'),
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
