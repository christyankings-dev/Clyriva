import { panelWorkspace } from '../state/workspace.ts';
import { mutate } from '../state/transactions.ts';
import { state } from '../state/filters.ts';
import { vaultSession } from '../vault/session.ts';
import { internalDocsApi } from '../documents/api.ts';
import { toast } from '../lib/feedback.ts';
import { errorInfo } from '../../../shared/lib/errors.ts';
import type { Client, WorkspaceGroup } from '../../../shared/domain/types.ts';

type Deletable = 'client' | 'invoice' | 'cash' | 'task' | 'tax';

const TABLES: Record<Deletable, WorkspaceGroup> = {
  client: 'clients',
  invoice: 'invoices',
  cash: 'cash',
  task: 'tasks',
  tax: 'taxes',
};

const isDeletable = (type: string): type is Deletable => Object.hasOwn(TABLES, type);

function confirmDel(type: string, target: string): void {
  if (!isDeletable(type)) return;
  const tableName = TABLES[type];
  const rows = panelWorkspace.data[tableName] as { id: string }[];
  const x = rows.find((r) => r.id === target);
  if (!x) return;
  let text = 'Excluir este registro?';
  if (type === 'client')
    text = `Excluir ${(x as Client).name} e TODAS as suas notas, finanças, guias, obrigações e honorários? Os acessos ao aplicativo serão revogados e os avisos arquivados. As credenciais guardadas no cofre ficarão como 'Cliente removido'. Para manter os lançamentos, edite o cadastro e escolha Inativo.`;
  if (type === 'invoice' && panelWorkspace.data.cash.some((r) => r.invoiceId === x.id))
    text =
      'Excluir a NF? Os recebimentos vinculados serão preservados, mas ficarão desvinculados da NF.';
  if (!window.confirm(text)) return;
  mutate(() => {
    Object.assign(panelWorkspace.data, { [tableName]: rows.filter((r) => r.id !== target) });
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
      }).catch((e: unknown) =>
        toast(
          'Registro excluído, mas o aviso do cliente precisa ser arquivado: ' +
            errorInfo(e).message,
          true,
        ),
      );
  });
}

export { confirmDel };
