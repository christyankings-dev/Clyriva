import type {
  CashEntry,
  Client,
  Fee,
  Invoice,
  Task,
  Tax,
  VaultData,
} from '../../shared/domain/types.ts';

export type PageName =
  | 'dashboard'
  | 'clients'
  | 'service'
  | 'vault'
  | 'invoices'
  | 'cash'
  | 'fees'
  | 'taxes'
  | 'tasks'
  | 'reports'
  | 'settings'
  | 'detail';

/** Filtros e navegação do painel (um objeto compartilhado, lido pelas páginas). */
export interface PanelState {
  page: PageName;
  month: string;
  client: string;
  query: string;
  status: string;
  priority: string;
  detail: string | null;
  vaultClient: string;
}

/** Tipos de registro que o painel sabe criar, editar e excluir. */
export type RecordType = 'client' | 'invoice' | 'cash' | 'task' | 'tax' | 'fee';

export interface RecordMap {
  client: Client;
  invoice: Invoice;
  cash: CashEntry;
  task: Task;
  tax: Tax;
  fee: Fee;
}

/** Valores iniciais de um formulário novo (ex.: cliente já escolhido). */
export interface RecordPreset {
  clientId?: string;
  invoiceId?: string;
  category?: string;
  status?: string;
}

export type FormValues = Record<string, string>;

export interface VaultSessionState {
  vaultData: VaultData | null;
  vaultSelectedClient: string;
}
