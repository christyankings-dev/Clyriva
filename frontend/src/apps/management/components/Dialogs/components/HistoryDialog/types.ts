export interface HistoryRow {
  revision: number;
  saved_at: string;
  saved_by?: string;
}

export type HistoryState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; rows: HistoryRow[] };
