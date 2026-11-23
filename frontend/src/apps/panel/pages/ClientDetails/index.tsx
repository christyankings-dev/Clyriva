import { Action, PageHeader } from '../../components/index.ts';
import { state } from '../../state/filters.ts';
import { client as findClient } from '../../state/selectors.ts';
import { panelWorkspace } from '../../state/workspace.ts';
import { ClientHeader } from './components/ClientHeader.tsx';
import { ClientInfoPanel } from './components/ClientInfoPanel.tsx';
import { ClientInvoicesPanel } from './components/ClientInvoicesPanel.tsx';
import { ClientMetrics } from './components/ClientMetrics.tsx';
import { ClientNotesPanel } from './components/ClientNotesPanel.tsx';
import { ClientTasksPanel } from './components/ClientTasksPanel.tsx';
import { ClientTaxesPanel } from './components/ClientTaxesPanel.tsx';
import { ClientVaultPanel } from './components/ClientVaultPanel.tsx';
import type { ClientMonth } from './types.ts';

const inMonth = (competence: string) => competence === state.month;

function monthOf(clientId: string): ClientMonth {
  const { invoices, cash, tasks, taxes } = panelWorkspace.data;
  return {
    invoices: invoices
      .filter((x) => x.clientId === clientId && inMonth(x.competence))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))),
    cash: cash.filter(
      (x) => x.clientId === clientId && String(x.date || '').slice(0, 7) === state.month,
    ),
    tasks: tasks.filter((x) => x.clientId === clientId && inMonth(x.competence)),
    taxes: taxes.filter((x) => x.clientId === clientId && inMonth(x.competence)),
  };
}

export function ClientDetails() {
  const client = findClient(state.detail);
  if (!client)
    return (
      <PageHeader
        eyebrow="CLIENTE"
        title="Cliente não encontrado"
        description="Volte para a lista de clientes."
        actions={<Action action="go-clients">Ver clientes</Action>}
      />
    );
  const month = monthOf(client.id);
  return (
    <>
      <ClientHeader client={client} />
      <ClientMetrics client={client} month={month} />
      <div className="details-grid">
        <ClientInfoPanel client={client} />
        <ClientNotesPanel client={client} />
        <ClientVaultPanel client={client} />
      </div>
      <div className="grid-main">
        <ClientInvoicesPanel client={client} invoices={month.invoices} />
        <ClientTasksPanel client={client} tasks={month.tasks} />
      </div>
      <ClientTaxesPanel client={client} taxes={month.taxes} />
    </>
  );
}
