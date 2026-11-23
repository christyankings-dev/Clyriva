import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { routes } from './routes.ts';
import { rotina, state } from '../state/filters.ts';
import { must } from '../lib/format.ts';
import { names } from './labels.ts';
import { CompanyOptions } from '../components/index.ts';
import { slot } from '../../../shared/lib/slot.ts';
import { indexState, lookupIndexes } from '../state/selectors.ts';
import { core, panelWorkspace } from '../state/workspace.ts';

let pageRoot: Root | undefined;
const clientFilter = slot('#client-filter');
let clientOptionsDirty = true;

function updateNav(): void {
  document
    .querySelectorAll<HTMLElement>('[data-page]')
    .forEach((el) => el.classList.toggle('on', el.dataset.page === state.page));
  must('#breadcrumb').textContent = names[state.page];
  must<HTMLInputElement>('#month').value = state.month;
  if (clientOptionsDirty) {
    clientFilter.render(<CompanyOptions />);
    clientOptionsDirty = false;
  }
  must<HTMLSelectElement>('#client-filter').value = state.client;
}

function render(): void {
  rotina.closeSummary();
  if (indexState.indexesDirty) {
    indexState.indexesDirty = false;
    clientOptionsDirty = true;
    lookupIndexes.clientsById = new Map(panelWorkspace.data.clients.map((c) => [c.id, c]));
    lookupIndexes.feeIndex = new Map(
      panelWorkspace.data.fees.map((f) => [JSON.stringify([f.clientId, f.competence]), f]),
    );
    const invoiceOwners = new Map(panelWorkspace.data.invoices.map((i) => [i.id, i.clientId]));
    lookupIndexes.linkedReceipts = new Map();
    for (const r of panelWorkspace.data.cash)
      if (r.kind === 'receipt' && r.invoiceId && invoiceOwners.get(r.invoiceId) === r.clientId) {
        lookupIndexes.linkedReceipts.set(
          r.invoiceId,
          (lookupIndexes.linkedReceipts.get(r.invoiceId) || 0) + core.cents(r.value),
        );
      }
  }
  updateNav();
  const Page = routes[state.page] || routes.dashboard;
  // The delegated filter handlers restore keyboard focus immediately after rendering.
  const root = (pageRoot ??= createRoot(must('#page')));
  flushSync(() => root.render(createElement(Page)));
}

export { render };
