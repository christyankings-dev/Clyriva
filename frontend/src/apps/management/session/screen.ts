import { createStore } from '../../../shared/lib/store.ts';
import type { AuthFeedback, DialogKind, Screen } from '../types.ts';
import { configError, configured, sb } from './config.ts';
import { state } from './state.ts';

/** Mensagem inicial do acesso, conforme a configuração do projeto. */
function initialFeedback(): AuthFeedback | null {
  if (!configured)
    return {
      text: 'Modo demonstração disponível. Para autenticação real é necessário configurar o projeto Supabase.',
      type: 'warn',
    };
  if (!sb)
    return {
      text: configError || 'Não foi possível carregar a biblioteca de autenticação.',
      type: 'err',
    };
  return null;
}

const authFeedback = createStore<AuthFeedback | null>(initialFeedback());
const screen = createStore<Screen>({ kind: 'login', key: 0 });
const dialog = createStore<DialogKind>(null);
const syncStatus = createStore({ text: 'Conectado', bad: false, saving: false });

let nextKey = 0;

function statusMessage(text: string, type: AuthFeedback['type'] = ''): void {
  authFeedback.set({ text, type });
}

function showLogin(): void {
  state.mode = 'login';
  authFeedback.set(initialFeedback());
  screen.set({ kind: 'login', key: ++nextKey });
}

function showReset(): void {
  authFeedback.set(null);
  screen.set({ kind: 'reset', key: ++nextKey });
}

function showFailure(message: string, retry: () => void): void {
  screen.set({ kind: 'failure', key: ++nextKey, message, retry });
}

/** Monta (ou remonta) o painel administrativo com o iframe do painel completo. */
function showAdmin(): void {
  state.frame = null;
  state.adminTab = 'panel';
  syncStatus.set({ text: 'Conectado', bad: false, saving: false });
  screen.set({ kind: 'admin', key: ++nextKey });
}

function syncLabel(text: string, bad = false): void {
  syncStatus.set({ text, bad, saving: state.saving });
}

export {
  authFeedback,
  dialog,
  screen,
  showAdmin,
  showFailure,
  showLogin,
  showReset,
  statusMessage,
  syncLabel,
  syncStatus,
};
