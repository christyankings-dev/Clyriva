import { busy, panelWorkspace } from '../state/workspace.ts';
import { publishInternalDoc } from '../documents/publish.ts';
import { openInternalDocs } from '../documents/openDocs.ts';
import { openClientSummary } from '../clients/summary.ts';
import { vaultChangeModal, vaultDelete, vaultEntryModal } from '../vault/forms.ts';
import { vaultLock, vaultOperation, vaultSession } from '../vault/session.ts';
import { must } from '../lib/format.ts';
import { go } from './go.ts';
import { invalidateView } from '../state/viewChanges.ts';
import { lookupCnpj } from '../clients/cnpj/lookup.ts';
import { openModal } from '../forms/editor.tsx';
import { copyClientBrief, copyService } from '../clients/clipboard.ts';
import { closeModal } from '../forms/dialog.tsx';
import { confirmDel } from '../forms/deleteRecord.ts';
import { state } from '../state/filters.ts';
import { mutate } from '../state/transactions.ts';
import { copyTasks } from '../tasks/copyMonth.ts';
import { exportCsv } from '../reports/exportCsv.ts';
import { backup } from '../backup/workspaceBackup.ts';
import { toast } from '../lib/feedback.ts';
import type { PageName } from '../types.ts';

/** Origem da ação: basta o `data-id` do botão (a agenda chama sem elemento). */
type ActionTarget = Pick<HTMLElement, 'dataset'>;

function handleAction(a: string, target: ActionTarget): unknown {
  if (busy) return;
  const rid = target.dataset.id ?? '';
  if (a === 'publish-task' || a === 'publish-tax')
    return publishInternalDoc(a.slice(8) as 'task' | 'tax', rid);
  if (a === 'docs-task' || a === 'docs-tax') return openInternalDocs(a.slice(5), rid);
  if (a === 'resumo-cliente') return openClientSummary(rid);
  if (a === 'vault-new') return vaultEntryModal();
  if (a === 'vault-lock') return vaultLock();
  if (a === 'vault-change') return vaultChangeModal();
  if (a === 'vault-edit') return vaultEntryModal(rid);
  if (a === 'vault-delete') return vaultOperation(() => vaultDelete(rid));
  if (a === 'vault-for') {
    vaultSession.vaultSelectedClient = rid;
    return go('vault');
  }
  if (a === 'lookup-cnpj') return lookupCnpj(true);
  if (a === 'new-service')
    return openModal('task', null, {
      category: 'Atendimento',
    });
  if (a === 'copy-service') return copyService(rid);
  if (a === 'copy-client-brief') return copyClientBrief(rid);
  if (a.startsWith('go-')) return go(a.slice(3) as PageName);
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
  if (a === 'import') return must<HTMLInputElement>('#import-file').click();
  if (a === 'demo' || a === 'clear') return toast('Operação desativada por segurança.', true);
}

export { handleAction };
