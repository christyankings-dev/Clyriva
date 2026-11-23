import { ios, standalone } from './platform.ts';
import { must } from '../../../shared/lib/dom.ts';
import { api } from '../api.ts';
import type { DeviceInfo, PushPreference } from '../types.ts';
import { CLIENT_SCOPE, clientActivity, clientDevice } from './state.ts';
import { renderDevice } from './feedback.ts';

function unmetRequirement(): string {
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

async function legacyDevice(): Promise<DeviceInfo | null> {
  const worker = await navigator.serviceWorker.getRegistration?.('/');
  if (!worker || worker.scope !== new URL('/', location.href).href) return null;
  const sub = await worker.pushManager?.getSubscription();
  if (!sub) return null;
  const preference = await api<PushPreference>('client-push-status', {
    endpoint: sub.endpoint,
  });
  return preference.enabled
    ? {
        sub,
        preference,
      }
    : null;
}

async function currentDevice(worker: ServiceWorkerRegistration): Promise<DeviceInfo> {
  const sub = await worker.pushManager.getSubscription();
  if (sub) {
    const preference = await api<PushPreference>('client-push-status', {
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

async function refreshPushPreference(): Promise<void> {
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
    must<HTMLInputElement>('#client-show-amount').checked = device.preference.showAmount === true;
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

const supported = (): boolean => window.isSecureContext && 'serviceWorker' in navigator;

function ready(): Promise<ServiceWorkerRegistration> {
  if (!supported()) return Promise.reject(Error('Este navegador não suporta notificações.'));
  let pending = clientActivity.registrationPromise;
  if (!pending) {
    pending = navigator.serviceWorker
      .register('/sw.js', {
        scope: CLIENT_SCOPE,
      })
      .then((registration) => {
        if (registration.active?.state === 'activated') return registration;
        const worker = registration.installing || registration.waiting || registration.active;
        if (!worker) throw Error('Não foi possível preparar as notificações. Tente novamente.');
        const target: ServiceWorker = worker;
        return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
          function finish(ok: boolean): void {
            clearTimeout(timer);
            target.removeEventListener('statechange', changed);
            if (ok) resolve(registration);
            else reject(Error('Não foi possível preparar as notificações. Tente novamente.'));
          }
          function changed(): void {
            if (target.state === 'activated') finish(true);
            else if (target.state === 'redundant') finish(false);
          }
          const timer = setTimeout(() => finish(false), 10000);
          target.addEventListener('statechange', changed);
          changed();
        });
      })
      .catch((error) => {
        clientActivity.registrationPromise = null;
        throw error;
      });
    clientActivity.registrationPromise = pending;
  }
  return pending;
}

function decodeBase64(str: string): Uint8Array<ArrayBuffer> {
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
