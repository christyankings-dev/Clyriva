import type { VaultBlob, Workspace } from '../domain/types.ts';

/** Configuração pública publicada em /config.js (nunca contém chave secreta). */
export interface ClyrivaConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/** Ponte que a página de login oferece ao painel carregado em iframe. */
export interface PanelHost {
  token(child: Window): Promise<string | null>;
  open(child: Window): { data: unknown; vault: unknown; demo: boolean } | null;
  commit(child: Window, payload: Workspace, vault: VaultBlob | null): Promise<void>;
}

export interface PwaSession {
  isAdmin(): boolean;
  token(): Promise<string | null>;
}

/** Tentativa de notificação de teste guardada no IndexedDB do aparelho. */
export interface PushTestRow {
  id: string;
  owner?: string | null;
  state?: string;
  started: number;
  shownAt?: number | null;
}

export interface PushTestStore {
  validId(id: unknown): id is string;
  read(owner: string): Promise<PushTestRow | null>;
  start(row: PushTestRow): Promise<PushTestRow>;
  mark(id: string, state: string, time?: number): Promise<PushTestRow | null>;
  forget(id: string): Promise<null>;
}

/** Evento nativo do Chrome/Android que oferece a instalação do aplicativo. */
export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
