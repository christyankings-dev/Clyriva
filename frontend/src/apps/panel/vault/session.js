import { busy, core, panelWorkspace, persist, readVaultBlob, setBusy } from '../state/workspace.js';
import { closeModal } from '../forms/dialog.js';
import { invalidateView } from '../state/viewChanges.js';
import { toast } from '../lib/feedback.js';
import { b64ToBytes, deriveVaultKey, encryptVault, vaultAvailable } from './crypto.js';
import { $ } from '../lib/format.js';

let vaultCryptoKey = null;

let vaultIdleTimer = null;

const vaultSession = {
  vaultData: null,
  vaultSelectedClient: 'all',
};

let vaultDeadline = 0;

function expireVault() {
  if (!vaultSession.vaultData || busy || Date.now() < vaultDeadline) return;
  forgetVault();
  closeModal();
  invalidateView();
  toast('Cofre bloqueado após 10 minutos de inatividade.');
}

function touchVault() {
  if (!vaultSession.vaultData || busy) return;
  if (vaultDeadline && Date.now() >= vaultDeadline) {
    expireVault();
    return;
  }
  clearTimeout(vaultIdleTimer);
  vaultDeadline = Date.now() + 600000;
  vaultIdleTimer = setTimeout(expireVault, 600000);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) expireVault();
});

function lockOnExit() {
  if (panelWorkspace.initialized && vaultSession.vaultData) {
    forgetVault();
    closeModal();
    invalidateView();
  }
}

window.addEventListener('pagehide', lockOnExit);

window.addEventListener('pageshow', (e) => {
  if (e.persisted) lockOnExit();
});

document.addEventListener('pointerdown', touchVault);

document.addEventListener('keydown', touchVault);

const storeVaultBlob = (blob) => persist(panelWorkspace.data, core.vault(blob));

const vaultExists = () => Boolean(readVaultBlob());

async function persistVault() {
  if (!vaultCryptoKey || !vaultSession.vaultData) return false;
  const prior = readVaultBlob();
  if (!prior) return false;
  try {
    const fresh = await encryptVault(
      vaultSession.vaultData,
      vaultCryptoKey,
      b64ToBytes(prior.salt),
      prior.iterations,
    );
    await storeVaultBlob(fresh);
    return true;
  } catch (e) {
    toast('Cofre não salvo. ' + e.message, true);
    return false;
  }
}

function forgetVault() {
  clearTimeout(vaultIdleTimer);
  vaultDeadline = 0;
  vaultSession.vaultData = null;
  vaultCryptoKey = null;
  vaultSession.vaultSelectedClient = 'all';
}

function vaultLock() {
  forgetVault();
  $('#modal-root').innerHTML = '';
  invalidateView();
  toast('Cofre bloqueado.');
}

async function vaultSetup(form) {
  const pass = form.elements.master.value,
    confirm = form.elements.confirm.value;
  if (!vaultAvailable())
    return toast(
      'Este navegador não suporta criptografia segura neste contexto. Abra o arquivo no Chrome ou Edge atualizado.',
      true,
    );
  if (vaultExists()) return toast('Já existe um cofre. Desbloqueie-o.', true);
  if (pass.length < 12) return toast('A senha-mestra precisa ter ao menos 12 caracteres.', true);
  if (pass !== confirm) return toast('A confirmação da senha-mestra é diferente.', true);
  const btn = form.querySelector('[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Criando cofre…';
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveVaultKey(pass, salt);
    const payload = {
      version: 1,
      access: [],
    };
    const stored = await encryptVault(payload, key, salt);
    await storeVaultBlob(stored);
    vaultCryptoKey = key;
    vaultSession.vaultData = payload;
    touchVault();
    invalidateView();
    toast('Cofre criado e desbloqueado. Guarde a senha-mestra: ela não pode ser recuperada.');
  } catch (e) {
    toast('Cofre não salvo. ' + e.message, true);
    btn.disabled = false;
    btn.textContent = 'Criar cofre';
  }
}

async function vaultUnlock(form) {
  const blob = readVaultBlob();
  if (!blob) return toast('Cofre indisponível ou com estrutura inválida.', true);
  if (!vaultAvailable()) return toast('Web Crypto indisponível neste navegador.', true);
  const btn = form.querySelector('[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Desbloqueando…';
  try {
    const salt = b64ToBytes(blob.salt);
    const key = await deriveVaultKey(form.elements.master.value, salt, blob.iterations);
    const plain = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: b64ToBytes(blob.iv),
      },
      key,
      b64ToBytes(blob.cipher),
    );
    const obj = JSON.parse(new TextDecoder().decode(plain));
    if (
      obj.version !== 1 ||
      !Array.isArray(obj.access) ||
      obj.access.some(
        (a) =>
          !a ||
          typeof a.id !== 'string' ||
          typeof a.clientId !== 'string' ||
          typeof a.label !== 'string',
      ) ||
      new Set(obj.access.map((a) => a.id)).size !== obj.access.length
    )
      throw Error('Formato inválido');
    vaultSession.vaultData = obj;
    vaultCryptoKey = key;
    touchVault();
    invalidateView();
    toast('Cofre desbloqueado.');
  } catch {
    toast('Senha-mestra incorreta ou dados do cofre corrompidos.', true);
    btn.disabled = false;
    btn.textContent = 'Desbloquear';
  }
}

async function vaultChangeMaster(form) {
  if (!vaultSession.vaultData || !vaultCryptoKey) return toast('Desbloqueie o cofre.', true);
  const p = form.elements.master.value,
    c = form.elements.confirm.value;
  if (p.length < 12) return toast('Use pelo menos 12 caracteres na nova senha.', true);
  if (p !== c) return toast('A confirmação não corresponde à nova senha.', true);
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const k = await deriveVaultKey(p, salt);
    const blob = await encryptVault(vaultSession.vaultData, k, salt);
    await storeVaultBlob(blob);
    vaultCryptoKey = k;
    closeModal();
    touchVault();
    invalidateView();
    toast('Senha-mestra atualizada. Use a nova senha para desbloquear.');
  } catch (e) {
    toast('Senha-mestra não alterada. ' + e.message, true);
  }
}

async function vaultOperation(action) {
  if (busy) return;
  setBusy(true);
  clearTimeout(vaultIdleTimer);
  vaultDeadline = 0;
  try {
    await action();
  } finally {
    setBusy(false);
    touchVault();
  }
}

export {
  forgetVault,
  persistVault,
  touchVault,
  vaultChangeMaster,
  vaultExists,
  vaultLock,
  vaultOperation,
  vaultSession,
  vaultSetup,
  vaultUnlock,
};
