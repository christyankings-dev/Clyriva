import { client, paidToInvoice } from '../state/selectors.js';
import { demoMode, rotina, state } from '../state/filters.js';
import { panelWorkspace } from '../state/workspace.js';

function openClientSummary(id) {
  const c = client(id);
  if (!c) return;
  const inMonth = (x) => x.clientId === id && x.competence === state.month;
  const info = {
    client: {
      name: c.name,
      tradeName: c.tradeName,
    },
    invoices: panelWorkspace.data.invoices.filter(inMonth).map((x) => ({
      status: x.status,
      competence: x.competence,
      value: x.value,
      paid: paidToInvoice(x.id),
    })),
    taxes: panelWorkspace.data.taxes.filter(inMonth).map((x) => ({
      kind: x.kind,
      value: x.value,
      status: x.status,
      competence: x.competence,
      dueDate: x.dueDate,
    })),
    tasks: panelWorkspace.data.tasks.filter(inMonth).map((x) => ({
      title: x.title,
      status: x.status,
      competence: x.competence,
      dueDate: x.dueDate,
    })),
  };
  rotina.showSummary(info, state.month, {
    demo: demoMode.demoSession,
  });
}

export { openClientSummary };
