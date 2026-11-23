import { panelWorkspace } from '../state/workspace.js';
import { describeClient, saveClient } from './records/client.js';
import { describeInvoice, saveInvoice } from './records/invoice.js';
import { describeCash, saveCash } from './records/cash.js';
import { describeTask, saveTask } from './records/task.js';
import { describeTax, saveTax } from './records/tax.js';
import { describeFee, saveFee } from './records/fee.js';

export const recordForms = {
  client: { collection: 'clients', describe: describeClient, save: saveClient },
  invoice: { collection: 'invoices', describe: describeInvoice, save: saveInvoice },
  cash: { collection: 'cash', describe: describeCash, save: saveCash },
  task: { collection: 'tasks', describe: describeTask, save: saveTask },
  tax: { collection: 'taxes', describe: describeTax, save: saveTax },
  fee: { collection: 'fees', describe: describeFee, save: saveFee },
};

export function findRecord(type, id) {
  if (!id) return undefined;
  return panelWorkspace.data[recordForms[type].collection].find((record) => record.id === id);
}
