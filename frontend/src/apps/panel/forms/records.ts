import type { RecordMap, RecordType } from '../types.ts';
import { panelWorkspace } from '../state/workspace.ts';
import { describeCash, saveCash } from './records/cash.tsx';
import { describeClient, saveClient } from './records/client.tsx';
import { describeFee, saveFee } from './records/fee.tsx';
import { describeInvoice, saveInvoice } from './records/invoice.tsx';
import { describeTask, saveTask } from './records/task.tsx';
import { describeTax, saveTax } from './records/tax.tsx';
import type { DescribeArgs, RecordSchema, SaveArgs } from './schema.ts';

interface RecordForm<T extends RecordType> {
  collection: 'clients' | 'invoices' | 'cash' | 'tasks' | 'taxes' | 'fees';
  describe(args: DescribeArgs<T>): RecordSchema;
  save(args: SaveArgs<T>): Promise<void>;
}

export const recordForms: { [T in RecordType]: RecordForm<T> } = {
  client: { collection: 'clients', describe: describeClient, save: saveClient },
  invoice: { collection: 'invoices', describe: describeInvoice, save: saveInvoice },
  cash: { collection: 'cash', describe: describeCash, save: saveCash },
  task: { collection: 'tasks', describe: describeTask, save: saveTask },
  tax: { collection: 'taxes', describe: describeTax, save: saveTax },
  fee: { collection: 'fees', describe: describeFee, save: saveFee },
};

export const isRecordType = (value: string | undefined): value is RecordType =>
  value !== undefined && Object.hasOwn(recordForms, value);

export function findRecord<T extends RecordType>(
  type: T,
  id: string | null | undefined,
): RecordMap[T] | undefined {
  if (!id) return undefined;
  const rows: { id: string }[] = panelWorkspace.data[recordForms[type].collection];
  return rows.find((record) => record.id === id) as RecordMap[T] | undefined;
}

/** Monta o formulário de um tipo de registro (a correlação tipo ↔ registro é garantida pelo chamador). */
export function describeRecord(type: RecordType, args: DescribeArgs<RecordType>): RecordSchema {
  return (recordForms[type] as RecordForm<RecordType>).describe(args);
}

export function saveRecordForm(type: RecordType, args: SaveArgs<RecordType>): Promise<void> {
  return (recordForms[type] as RecordForm<RecordType>).save(args);
}
