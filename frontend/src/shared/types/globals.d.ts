import type { SupabaseClient, createClient } from '@supabase/supabase-js';
import type { VaultBlob, Workspace } from '../domain/types.ts';

/** Configuração pública publicada em /config.js (nunca contém chave secreta). */
interface ClyrivaConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/** Ponte que a página de login oferece ao painel carregado em iframe. */
interface PanelHost {
  token(child: Window): Promise<string | null>;
  open(child: Window): { data: unknown; vault: unknown; demo: boolean } | null;
  commit(child: Window, payload: Workspace, vault: VaultBlob | null): Promise<void>;
}

interface PwaSession {
  isAdmin(): boolean;
  token(): Promise<string | null>;
}

interface PushTestRow {
  id: string;
  owner?: string;
  state?: string;
  started?: number;
  shownAt?: number | null;
}

interface PushTestStore {
  validId(id: unknown): id is string;
  read(owner: string): Promise<PushTestRow | null>;
  start(row: PushTestRow): Promise<PushTestRow>;
  mark(id: string, state: string, time?: number): Promise<PushTestRow | null>;
  forget(id: string): Promise<null>;
}

declare global {
  interface Window {
    CLYRIVA_CONFIG?: Partial<ClyrivaConfig>;
    /** SDK embutido em /vendor/supabase.js (mesma versão dos tipos instalados). */
    supabase: { createClient: typeof createClient };
    ClyrivaPanelHost?: PanelHost;
    ClyrivaPwaSession?: PwaSession;
    ClyrivaPwa?: { open(): void };
  }
  var ClyrivaPushTest: PushTestStore;
}

export type { ClyrivaConfig, PanelHost, PushTestRow, PwaSession, SupabaseClient };
