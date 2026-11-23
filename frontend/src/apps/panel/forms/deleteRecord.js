import { panelWorkspace } from '../state/workspace.js';
import { mutate } from '../state/transactions.js';
import { state } from '../state/filters.js';
import { vaultSession } from '../vault/session.js';
import { internalDocsApi } from '../documents/api.js';
import { toast } from '../lib/feedback.js';

function confirmDel(type, target) {
  const tableName = {
    client: 'clients',
    invoice: 'invoices',
    cash: 'cash',
    task: 'tasks',
    tax: 'taxes',
  }[type];
  const x = panelWorkspace.data[tableName]?.find((r) => r.id === target);
  if (!x) return;
  let text = 'Excluir este registro?';
  if (type === 'client')
    text = `Excluir ${x.name} e TODAS as suas notas, finanças, guias, obrigações e honorários? Os acessos ao aplicativo serão revogados e os avisos arquivados. As credenciais guardadas no cofre ficarão como 'Cliente removido'. Para manter os lançamentos, edite o cadastro e escolha Inativo.`;
  if (type === 'invoice' && panelWorkspace.data.cash.some((r) => r.invoiceId === x.id))
    text =
      'Excluir a NF? Os recebimentos vinculados serão preservados, mas ficarão desvinculados da NF.';
  if (!window.confirm(text)) return;
  mutate(() => {
    panelWorkspace.data[tableName] = panelWorkspace.data[tableName].filter((r) => r.id !== target);
    if (type === 'client') {
      panelWorkspace.data.invoices = panelWorkspace.data.invoices.filter(
        (r) => r.clientId !== target,
      );
      panelWorkspace.data.cash = panelWorkspace.data.cash.filter((r) => r.clientId !== target);
      panelWorkspace.data.tasks = panelWorkspace.data.tasks.filter((r) => r.clientId !== target);
      panelWorkspace.data.fees = panelWorkspace.data.fees.filter((r) => r.clientId !== target);
      panelWorkspace.data.taxes = panelWorkspace.data.taxes.filter((r) => r.clientId !== target);
      if (state.client === target) state.client = 'all';
      if (vaultSession.vaultSelectedClient === target) vaultSession.vaultSelectedClient = 'all';
      if (state.page === 'detail' && state.detail === target) state.page = 'clients';
    }
    if (type === 'invoice')
      panelWorkspace.data.cash
        .filter((r) => r.invoiceId === target)
        .forEach((r) => (r.invoiceId = ''));
  }, 'Registro excluído.').then((saved) => {
    if (saved && ['task', 'tax'].includes(type))
      internalDocsApi('unpublish', {
        entityType: type,
        entityId: target,
      }).catch((e) =>
        toast(
          'Registro excluído, mas o aviso do cliente precisa ser arquivado: ' + e.message,
          true,
        ),
      );
  });
}

export { confirmDel };
