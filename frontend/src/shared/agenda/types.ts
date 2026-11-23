import type { Money, Task, Tax } from '../domain/types.ts';

export type OpenItemKind = 'tax' | 'task';

/** Item em aberto da agenda: uma guia ou uma tarefa já normalizada para exibição. */
export interface AgendaItem {
  type: OpenItemKind;
  id: string;
  clientId: string;
  title: string;
  company: string;
  competence: string;
  waiting: boolean;
  due: string;
  priority: number;
  value: Money | null;
}

/** Filtro e paginação da lista, preservados entre as renderizações do painel. */
export interface AgendaView {
  range: string;
  limit: number;
}

export type DocumentStatus = 'internal' | 'active' | 'paid' | 'archived';

/** Situação dos anexos e da publicação de uma guia ou tarefa (resposta de internal-overview). */
export interface DocumentRecord {
  clientId: string;
  type: OpenItemKind;
  id: string;
  files: number;
  privateFiles: number;
  status: DocumentStatus;
}

export interface DocumentOverview {
  records: DocumentRecord[];
}

export interface AgendaOptions {
  taxes: TaxRow[];
  tasks: TaskRow[];
  companyName?: (clientId: string) => string;
  onAction?: (verb: string, id: string, competence: string) => void;
  loadDocuments?: (() => Promise<DocumentOverview>) | null;
}

/** Guia como a agenda a lê. O resumo mensal não envia identificadores. */
export type TaxRow = Pick<Tax, 'kind' | 'value' | 'status' | 'competence' | 'dueDate'> & {
  id?: string;
  clientId?: string;
};

export type TaskRow = Pick<Task, 'title' | 'status' | 'competence' | 'dueDate'> & {
  id?: string;
  clientId?: string;
  awaitingClient?: boolean;
  priority?: string;
};

export interface SummaryClient {
  name: string;
  tradeName?: string;
}

/** Dados que o painel entrega ao resumo mensal de um cliente. */
export interface SummaryInfo {
  client: SummaryClient;
  invoices: { status: string; competence: string; value: Money; paid: Money }[];
  taxes: TaxRow[];
  tasks: TaskRow[];
}

export interface SummaryOptions {
  demo?: boolean;
  publishedAt?: string;
}

export interface SummarySection {
  title: string;
  lines: string[];
  note?: string;
}

export interface SummaryModel {
  name: string;
  header: string;
  sections: SummarySection[];
  footer: string;
  plain: string;
}
