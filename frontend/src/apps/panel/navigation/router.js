import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { routes } from './routes.js';
import { rotina, state } from '../state/filters.js';
import { $ } from '../lib/format.js';
import { names } from './labels.js';
import { companyOptions } from '../forms/companyOptions.js';
import { indexState, lookupIndexes } from '../state/selectors.js';
import { core, panelWorkspace } from '../state/workspace.js';

let pageRoot;
let clientOptionsDirty = true;

function updateNav() {
  document
    .querySelectorAll('[data-page]')
    .forEach((el) => el.classList.toggle('on', el.dataset.page === state.page));
  $('#breadcrumb').textContent = names[state.page];
  $('#month').value = state.month;
  if (clientOptionsDirty) {
    $('#client-filter').innerHTML = companyOptions(state.client, true);
    clientOptionsDirty = false;
  }
  $('#client-filter').value = state.client;
}

function render() {
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
  pageRoot ??= createRoot($('#page'));
  flushSync(() => pageRoot.render(createElement(Page)));
}

export { render };
