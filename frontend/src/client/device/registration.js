import { ios, standalone } from './platform.js';
import { $, api } from '../api.js';
import { CLIENT_SCOPE, clientActivity, clientDevice } from './state.js';
import { renderDevice } from './feedback.js';

function unmetRequirement() {
  if (ios && !standalone())
    return 'No iPhone ou iPad, adicione o aplicativo à Tela de Início pelo Safari e abra-o pelo ícone para ativar os alertas.';
  if (ios && (!('Notification' in window) || !('PushManager' in window)))
    return 'Para receber notificações no iPhone ou iPad, use iOS/iPadOS 16.4 ou posterior e abra o app pela Tela de Início.';
  if (!supported() || !('Notification' in window) || !('PushManager' in window))
    return 'Abra este link no Safari do iPhone ou em um navegador compatível no Android para ativar os alertas.';
  if (Notification.permission === 'denied')
    return 'As notificações estão bloqueadas. Libere a permissão nas configurações do aparelho ou do site e volte aqui.';
  return '';
}

async function legacyDevice() {
  const worker = await navigator.serviceWorker.getRegistration?.('/');
  if (!worker || worker.scope !== new URL('/', location.href).href) return null;
  const sub = await worker.pushManager?.getSubscription();
  if (!sub) return null;
  const preference = await api('client-push-status', {
    endpoint: sub.endpoint,
  });
  return preference.enabled
    ? {
        sub,
        preference,
      }
    : null;
}

async function currentDevice(worker) {
  const sub = await worker.pushManager.getSubscription();
  if (sub) {
    const preference = await api('client-push-status', {
      endpoint: sub.endpoint,
    });
    if (preference.enabled)
      return {
        sub,
        preference,
      };
  }
  // Só reutilizar a assinatura compartilhada de versões antigas se o servidor confirmar o vínculo com este cliente.
  return (
    (await legacyDevice()) || {
      sub,
      preference: {
        enabled: false,
      },
    }
  );
}

async function refreshPushPreference() {
  const version = ++clientDevice.deviceVersion;
  const problem = unmetRequirement();
  if (problem) {
    renderDevice(false, problem);
    return;
  }
  try {
    const device = await currentDevice(await ready());
    if (version !== clientDevice.deviceVersion || !clientActivity.loaded) return;
    clientDevice.lastDevice = device.preference.enabled ? device.sub : null;
    $('#client-show-amount').checked = device.preference.showAmount === true;
    const enabled = device.preference.enabled && Notification.permission === 'granted';
    renderDevice(
      enabled,
      enabled
        ? 'Notificações ativas. Você já pode testar este aparelho.'
        : 'Ative as notificações para receber e testar avisos neste aparelho.',
    );
  } catch {
    if (version === clientDevice.deviceVersion && clientActivity.loaded)
      renderDevice(
        false,
        'Não foi possível conferir este aparelho. Tente ativar as notificações novamente.',
      );
  }
}

const supported = () => window.isSecureContext && 'serviceWorker' in navigator;

function ready() {
  if (!supported()) return Promise.reject(Error('Este navegador não suporta notificações.'));
  if (!clientActivity.registrationPromise) {
    clientActivity.registrationPromise = navigator.serviceWorker
      .register('/sw.js', {
        scope: CLIENT_SCOPE,
      })
      .then((registration) => {
        if (registration.active?.state === 'activated') return registration;
        const worker = registration.installing || registration.waiting || registration.active;
        if (!worker) throw Error('Não foi possível preparar as notificações. Tente novamente.');
        return new Promise((resolve, reject) => {
          function finish(ok) {
            clearTimeout(timer);
            worker.removeEventListener('statechange', changed);
            if (ok) resolve(registration);
            else reject(Error('Não foi possível preparar as notificações. Tente novamente.'));
          }
          function changed() {
            if (worker.state === 'activated') finish(true);
            else if (worker.state === 'redundant') finish(false);
          }
          const timer = setTimeout(() => finish(false), 10000);
          worker.addEventListener('statechange', changed);
          changed();
        });
      })
      .catch((error) => {
        clientActivity.registrationPromise = null;
        throw error;
      });
  }
  return clientActivity.registrationPromise;
}

function decodeBase64(str) {
  const txt = atob(
    (str + '='.repeat((4 - (str.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'),
  );
  return Uint8Array.from(txt, (c) => c.charCodeAt(0));
}

export {
  currentDevice,
  decodeBase64,
  legacyDevice,
  ready,
  refreshPushPreference,
  supported,
  unmetRequirement,
};
