import { handleAction } from './actions.js';
import { go } from './go.js';
import { invalidateView } from '../state/viewChanges.js';
import { closeModal } from '../forms/dialog.js';
import {
  vaultChangeMaster,
  vaultOperation,
  vaultSession,
  vaultSetup,
  vaultUnlock,
} from '../vault/session.js';
import { vaultEntrySave } from '../vault/forms.js';
import { formSubmit } from '../forms/saveRecord.js';
import { documentChanged } from '../clients/cnpj.js';
import { agendaState, rotina, state } from '../state/filters.js';
import { $, currentMonth, n } from '../lib/format.js';
import { invoiceOpts, opt } from '../forms/fields.js';
import { client, feeRecord } from '../state/selectors.js';
import { busy } from '../state/workspace.js';
import { importJson } from '../backup/workspaceBackup.js';

document.addEventListener('click', (e) => {
  const actionEl = e.target.closest('[data-action]');
  if (actionEl) {
    e.preventDefault();
    handleAction(actionEl.dataset.action, actionEl);
    return;
  }
  const nav = e.target.closest('[data-page]');
  if (nav) {
    e.preventDefault();
    go(nav.dataset.page);
    return;
  }
  if (e.target.id === 'modal-backdrop') closeModal();
});

document.addEventListener('submit', (e) => {
  const form = e.target;
  const vaultForms = {
    'vault-setup-form': vaultSetup,
    'vault-unlock-form': vaultUnlock,
    'vault-entry-form': vaultEntrySave,
    'vault-change-form': vaultChangeMaster,
  };
  if (form.id === 'edit-form') {
    e.preventDefault();
    formSubmit(form);
  } else if (Object.hasOwn(vaultForms, form.id)) {
    e.preventDefault();
    vaultOperation(() => vaultForms[form.id](form));
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'f-document') documentChanged(e.target);
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'vault-client-filter') {
    vaultSession.vaultSelectedClient = e.target.value;
    invalidateView();
  }
  if (e.target.id === 'month') {
    state.month = e.target.value || currentMonth;
    invalidateView();
  }
  if (e.target.id === 'client-filter') {
    agendaState.agendaView = rotina.agendaView();
    state.client = e.target.value;
    if (state.page === 'detail') {
      state.detail = state.client;
      if (state.client === 'all') state.page = 'clients';
    }
    invalidateView();
  }
  if (e.target.id === 'status-filter') {
    state.status = e.target.value;
    invalidateView();
  }
  if (e.target.id === 'priority-filter') {
    state.priority = e.target.value;
    invalidateView();
  }
  if (e.target.id === 'f-kind' && e.target.form?.dataset.type === 'cash') {
    const sel = e.target.form.elements.invoiceId;
    sel.disabled = e.target.value === 'expense';
    if (sel.disabled) sel.value = '';
  }
  if (e.target.id === 'f-clientId' && e.target.form?.dataset.type === 'cash') {
    const sel = e.target.form.querySelector('[name="invoiceId"]');
    if (sel) sel.innerHTML = opt(invoiceOpts(e.target.value), '');
  }
  if (e.target.id === 'f-clientId' && e.target.form?.dataset.type === 'fee') {
    const m = e.target.form.querySelector('[name="competence"]')?.value || state.month;
    const r = feeRecord(e.target.value, m);
    e.target.form.querySelector('[name="expected"]').value =
      r?.expected ?? n(client(e.target.value)?.monthlyFee);
    e.target.form.querySelector('[name="paid"]').value = r?.paid ?? 0;
    e.target.form.querySelector('[name="paidAt"]').value = r?.paidAt || '';
    e.target.form.querySelector('[name="notes"]').value = r?.notes || '';
  }
  if (e.target.id === 'f-competence' && e.target.form?.dataset.type === 'fee') {
    const cid = e.target.form.querySelector('[name="clientId"]').value;
    const r = feeRecord(cid, e.target.value);
    e.target.form.querySelector('[name="expected"]').value =
      r?.expected ?? n(client(cid)?.monthlyFee);
    e.target.form.querySelector('[name="paid"]').value = r?.paid ?? 0;
    e.target.form.querySelector('[name="paidAt"]').value = r?.paidAt || '';
    e.target.form.querySelector('[name="notes"]').value = r?.notes || '';
  }
});

document.addEventListener('keydown', (e) => {
  if (e.target.id === 'global-search' && e.key === 'Enter') {
    e.preventDefault();
    state.client = 'all';
    state.page = 'clients';
    state.query = e.target.value.trim();
    state.status = 'all';
    state.priority = 'all';
    invalidateView();
    const box = $('#search');
    box?.focus();
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'search') {
    const pos = e.target.selectionStart ?? e.target.value.length;
    state.query = e.target.value;
    invalidateView();
    const box = $('#search');
    if (box) {
      box.focus();
      box.setSelectionRange(pos, pos);
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (busy) return;
  if (e.key === 'Escape') closeModal();
  const dialog = $('#modal-root [role=dialog]');
  if (!dialog || e.key !== 'Tab') return;
  const fields = [...dialog.querySelectorAll('button,input,select,textarea,summary')].filter(
    (x) => !x.disabled && x.getClientRects().length,
  );
  if (!fields.length) return;
  if (e.shiftKey && document.activeElement === fields[0]) {
    e.preventDefault();
    fields.at(-1).focus();
  }
  if (!e.shiftKey && document.activeElement === fields.at(-1)) {
    e.preventDefault();
    fields[0].focus();
  }
});

$('#hamb').addEventListener('click', () => {
  const isOpen = $('#side').classList.toggle('open');
  if (isOpen) {
    const cover = document.createElement('div');
    cover.id = 'scrim';
    cover.className = 'scrim show';
    cover.onclick = () => {
      $('#side').classList.remove('open');
      cover.remove();
    };
    document.body.append(cover);
  } else $('#scrim')?.remove();
});

$('#import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  importJson(file);
  e.target.value = '';
});
