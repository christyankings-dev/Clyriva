import type { CashEntry, Invoice, Task, Tax } from '../../../../shared/domain/types.ts';

/** Registros de um cliente na competência selecionada. */
export interface ClientMonth {
  invoices: Invoice[];
  cash: CashEntry[];
  tasks: Task[];
  taxes: Tax[];
}
