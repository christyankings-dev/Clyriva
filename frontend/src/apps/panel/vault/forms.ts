import { persistVault, touchVault, vaultSession } from './session.ts';
import { toast } from '../lib/feedback.ts';
import { panelWorkspace } from '../state/workspace.ts';
import { id } from '../lib/format.ts';
import { showModal } from '../components/ModalHost/index.tsx';
import { client, clientName } from '../state/selectors.ts';
import { closeModal } from '../forms/dialog.tsx';
import { invalidateView } from '../state/viewChanges.ts';
import type { VaultAccess } from '../../../shared/domain/types.ts';

function vaultEntryModal(editId = ''): void {
  if (!vaultSession.vaultData) return toast('Desbloqueie o cofre antes de continuar.', true);
  if (!panelWorkspace.data.clients.length)
    return toast('Cadastre um cliente antes de guardar acessos.', true);
  const a = vaultSession.vaultData.access.find((x) => x.id === editId);
  const clientId =
    a?.clientId ||
    (vaultSession.vaultSelectedClient !== 'all'
      ? vaultSession.vaultSelectedClient
      : panelWorkspace.data.clients[0].id);
  showModal({ kind: 'vault-entry', editId: a?.id || '', clientId });
}

async function vaultEntrySave(form: HTMLFormElement): Promise<void> {
  if (!vaultSession.vaultData) return;
  const v = Object.fromEntries(
    [...new FormData(form).entries()].map(([key, value]) => [key, String(value)]),
  );
  if (!client(v.clientId)) return toast('Selecione um cliente válido.', true);
  if (!v.label?.trim()) return toast('Informe o portal ou serviço.', true);
  const old = vaultSession.vaultData.access.find((x) => x.id === form.dataset.edit);
  const item: VaultAccess = {
    clientId: v.clientId,
    username: v.username,
    site: v.site,
    password: v.password,
    notes: v.notes,
    label: v.label.trim(),
    id: old?.id || id(),
  };
  const previous = JSON.stringify(vaultSession.vaultData);
  if (old) Object.assign(old, item);
  else vaultSession.vaultData.access.push(item);
  if (!(await persistVault())) {
    vaultSession.vaultData = JSON.parse(previous);
    return;
  }
  closeModal();
  touchVault();
  invalidateView();
  toast('Acesso salvo no cofre criptografado.');
}

async function vaultDelete(accessId: string): Promise<void> {
  if (!vaultSession.vaultData) return;
  const item = vaultSession.vaultData.access.find((x) => x.id === accessId);
  if (!item) return;
  if (
    !window.confirm(
      `Excluir permanentemente o acesso ${item.label} de ${clientName(item.clientId)}?`,
    )
  )
    return;
  const prev = JSON.stringify(vaultSession.vaultData);
  vaultSession.vaultData.access = vaultSession.vaultData.access.filter((x) => x.id !== accessId);
  if (!(await persistVault())) {
    vaultSession.vaultData = JSON.parse(prev);
    return;
  }
  invalidateView();
  toast('Acesso excluído.');
}

function vaultChangeModal(): void {
  if (!vaultSession.vaultData) return;
  showModal({ kind: 'vault-change' });
}

export { vaultChangeModal, vaultDelete, vaultEntryModal, vaultEntrySave };
