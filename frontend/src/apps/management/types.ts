import type { User } from '@supabase/supabase-js';
import type { VaultBlob, Workspace } from '../../shared/domain/types.ts';

export type Mode = 'login' | 'admin' | 'demo-admin' | 'error';

/** Estado da sessão da gestão (um único objeto, lido também pela ponte do painel). */
export interface SessionState {
  mode: Mode;
  user: User | null;
  adminPayload: Workspace;
  vault: VaultBlob | null;
  revision: number;
  clientViews: unknown[];
  access: unknown[];
  month: string;
  selectedClient: string | null;
  adminTab: string;
  frame: HTMLIFrameElement | null;
  saving: boolean;
  authBusy: boolean;
}

/** Mensagem exibida sob o formulário de acesso. */
export interface AuthFeedback {
  text: string;
  type: '' | 'warn' | 'err';
}

export type Screen =
  | { kind: 'login'; key: number }
  | { kind: 'reset'; key: number }
  | { kind: 'failure'; key: number; message: string; retry: () => void }
  | { kind: 'admin'; key: number };

export type DialogKind = 'history' | 'password' | 'pwa' | null;
