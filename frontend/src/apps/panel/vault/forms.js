import { persistVault, touchVault, vaultSession } from './session.js';
import { toast } from '../lib/feedback.js';
import { panelWorkspace } from '../state/workspace.js';
import { $, esc, id } from '../lib/format.js';
import { clientOpts, field } from '../forms/fields.js';
import { client, clientName } from '../state/selectors.js';
import { closeModal } from '../forms/dialog.js';
import { invalidateView } from '../state/viewChanges.js';

function vaultEntryModal(editId = '') {
  if (!vaultSession.vaultData) return toast('Desbloqueie o cofre antes de continuar.', true);
  if (!panelWorkspace.data.clients.length)
    return toast('Cadastre um cliente antes de guardar acessos.', true);
  const a = vaultSession.vaultData.access.find((x) => x.id === editId);
  const cid =
    a?.clientId ||
    (vaultSession.vaultSelectedClient !== 'all'
      ? vaultSession.vaultSelectedClient
      : panelWorkspace.data.clients[0].id);
  $('#modal-root').innerHTML =
    `<div class="modal-backdrop" id="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><h2 id="modal-title">${a ? 'Editar acesso' : 'Novo acesso protegido'}</h2><p>E-mail/login, senha, portal e notas serão guardados no cofre criptografado.</p></div><button class="modal-close" type="button" data-action="close-modal">×</button></div><form id="vault-entry-form" data-edit="${esc(a?.id || '')}"><div class="modal-fields">${field(
      'Cliente',
      'clientId',
      cid,
      {
        options: clientOpts(),
        required: true,
        wide: true,
      },
    )}${field('Serviço / Portal', 'label', a?.label || '', {
      required: true,
      placeholder: 'Ex.: Portal NFS-e, e-CAC, Conta Google',
    })}${field('E-mail / usuário de login', 'username', a?.username || '', {
      placeholder: 'login@empresa.com',
    })}${field('Endereço do portal (URL)', 'site', a?.site || '', {
      wide: true,
      placeholder: 'https://...',
    })}<div class="field wide"><label for="vault-password">Senha do portal</label><div class="secret-input"><input id="vault-password" type="password" name="password" value="${esc(a?.password || '')}" autocomplete="off" spellcheck="false" placeholder="Senha guardada no cofre"><button type="button" class="btn" data-action="vault-toggle">Mostrar</button></div></div>${field(
      'Observações do acesso (protegidas)',
      'notes',
      a?.notes || '',
      {
        area: true,
        wide: true,
      },
    )}</div><div class="modal-foot"><button type="button" class="btn" data-action="close-modal">Cancelar</button><button type="submit" class="btn primary">Salvar no cofre</button></div></form></div></div>`;
  $('#vault-entry-form [name=label]')?.focus();
}

async function vaultEntrySave(form) {
  if (!vaultSession.vaultData) return;
  const v = Object.fromEntries(new FormData(form).entries());
  if (!client(v.clientId)) return toast('Selecione um cliente válido.', true);
  if (!v.label.trim()) return toast('Informe o portal ou serviço.', true);
  const old = vaultSession.vaultData.access.find((x) => x.id === form.dataset.edit);
  const item = {
    ...v,
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

async function vaultDelete(accessId) {
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

function vaultChangeModal() {
  if (!vaultSession.vaultData) return;
  $('#modal-root').innerHTML =
    `<div class="modal-backdrop" id="modal-backdrop"><div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h2>Alterar senha-mestra</h2><p>O cofre será criptografado novamente com a nova senha.</p></div><button class="modal-close" type="button" data-action="close-modal">×</button></div><form id="vault-change-form"><div class="modal-fields">${field(
      'Nova senha-mestra',
      'master',
      '',
      {
        type: 'password',
        required: true,
        wide: true,
      },
    )}${field('Confirme a nova senha-mestra', 'confirm', '', {
      type: 'password',
      required: true,
      wide: true,
    })}</div><div class="modal-foot"><button type="button" class="btn" data-action="close-modal">Cancelar</button><button type="submit" class="btn primary">Atualizar senha-mestra</button></div></form></div></div>`;
}

export { vaultChangeModal, vaultDelete, vaultEntryModal, vaultEntrySave };
