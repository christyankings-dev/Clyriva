import { busy, panelWorkspace } from '../state/workspace.js';
import { publishInternalDoc } from '../documents/publish.js';
import { openInternalDocs } from '../documents/dialog.js';
import { openClientSummary } from '../clients/summary.js';
import { vaultChangeModal, vaultDelete, vaultEntryModal } from '../vault/forms.js';
import { vaultLock, vaultOperation, vaultSession } from '../vault/session.js';
import { $ } from '../lib/format.js';
import { go } from './go.js';
import { invalidateView } from '../state/viewChanges.js';
import { lookupCnpj } from '../clients/cnpj.js';
import { openModal } from '../forms/editor.js';
import { copyClientBrief, copyService } from '../clients/clipboard.js';
import { closeModal } from '../forms/dialog.js';
import { confirmDel } from '../forms/deleteRecord.js';
import { state } from '../state/filters.js';
import { mutate } from '../state/transactions.js';
import { copyTasks } from '../tasks/copyMonth.js';
import { exportCsv } from '../reports/exportCsv.js';
import { backup } from '../backup/workspaceBackup.js';
import { toast } from '../lib/feedback.js';

function handleAction(a, target) {
  if (busy) return;
  if (a === 'publish-task' || a === 'publish-tax')
    return publishInternalDoc(a.slice(8), target.dataset.id);
  if (a === 'docs-task' || a === 'docs-tax') return openInternalDocs(a.slice(5), target.dataset.id);
  if (a === 'resumo-cliente') return openClientSummary(target.dataset.id);
  if (a === 'vault-new') return vaultEntryModal();
  if (a === 'vault-lock') return vaultLock();
  if (a === 'vault-change') return vaultChangeModal();
  if (a === 'vault-toggle') {
    const el = $('#vault-password');
    if (el) {
      el.type = el.type === 'password' ? 'text' : 'password';
      target.textContent = el.type === 'password' ? 'Mostrar' : 'Ocultar';
    }
    return;
  }
  if (a === 'vault-edit') return vaultEntryModal(target.dataset.id);
  if (a === 'vault-delete') return vaultOperation(() => vaultDelete(target.dataset.id));
  if (a === 'vault-for') {
    vaultSession.vaultSelectedClient = target.dataset.id;
    return go('vault');
  }
  if (a === 'lookup-cnpj') return lookupCnpj(true);
  if (a === 'new-service')
    return openModal('task', null, {
      category: 'Atendimento',
    });
  const rid = target.dataset.id;
  if (a === 'copy-service') return copyService(rid);
  if (a === 'copy-client-brief') return copyClientBrief(rid);
  if (a.startsWith('go-')) return go(a.slice(3));
  if (a === 'close-modal') return closeModal();
  if (a.startsWith('new-')) {
    const s = a.slice(4);
    if (s === 'receipt-for')
      return openModal('cash', null, {
        invoiceId: rid,
      });
    if (s === 'invoice-for' || s === 'task-for' || s === 'tax-for')
      return openModal(s.replace('-for', ''), null, {
        clientId: rid,
      });
    return openModal(s);
  }
  if (a.startsWith('edit-')) return openModal(a.slice(5), rid);
  if (a.startsWith('delete-')) return confirmDel(a.slice(7), rid);
  if (a === 'view-client') {
    state.detail = rid;
    state.page = 'detail';
    invalidateView();
    window.scrollTo(0, 0);
    return;
  }
  if (a === 'fee-for')
    return openModal('fee', null, {
      clientId: rid,
    });
  if (a === 'pay-tax') {
    return openModal('tax', rid, {
      status: 'paid',
    });
  }
  if (a === 'complete-task') {
    return mutate(() => {
      const t = panelWorkspace.data.tasks.find((x) => x.id === rid);
      if (t) t.status = 'done';
    }, 'Tarefa concluída.').then((saved) => {
      if (saved) publishInternalDoc('task', rid, true);
    });
  }
  if (a === 'copy-tasks') return copyTasks();
  if (a === 'export-csv') return exportCsv();
  if (a === 'backup') return backup();
  if (a === 'import') return $('#import-file').click();
  if (a === 'demo' || a === 'clear') return toast('Operação desativada por segurança.', true);
}

export { handleAction };
