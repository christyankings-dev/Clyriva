/* Clyriva PWA - instalacao voluntaria e Web Push com permissao explicita. */
import type { InstallPromptEvent } from '../../../shared/types/bridges.ts';
import { createStore } from '../../../shared/lib/store.ts';
import { errorInfo } from '../../../shared/lib/errors.ts';
import { dialog } from '../session/screen.ts';

type PwaAction = 'enable' | 'test' | 'disable';

const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
const standalone = (): boolean =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
const config = window.CLYRIVA_CONFIG || {};
const base = String(config.supabaseUrl || '').replace(/\/$/, '') + '/functions/v1/clyriva-push';
const supported = (): boolean => window.isSecureContext && 'serviceWorker' in navigator;

const INSTALL_LABEL = '⬇ Instalar Clyriva';
const ALERTS_LABEL = '◈ Alertas do Clyriva';

const triggerLabel = createStore(standalone() ? ALERTS_LABEL : INSTALL_LABEL);
const pwaStatus = createStore('');
const pwaBusy = createStore<Record<PwaAction, boolean>>({
  enable: false,
  test: false,
  disable: false,
});

let deferred: InstallPromptEvent | null = null;
let registration: ServiceWorkerRegistration | null = null;

if (supported()) {
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((r) => (registration = r))
    .catch(() => {});
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallPromptEvent;
  triggerLabel.set(INSTALL_LABEL);
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  triggerLabel.set(ALERTS_LABEL);
});

const update = (text: string): void => pwaStatus.set(text);

async function api(action: string, data?: object): Promise<void> {
  const token = await window.ClyrivaPwaSession?.token?.();
  if (!token) throw Error('Entre com seu login de administrador antes de ativar as notificações.');
  if (!config.supabaseUrl || !config.supabaseAnonKey) throw Error('Supabase não está configurado.');
  const res = await fetch(base + '/' + action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.supabaseAnonKey,
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify(data || {}),
    cache: 'no-store',
  });
  let out: { ok?: boolean; error?: string } = {};
  try {
    out = await res.json();
  } catch {}
  if (!res.ok || !out.ok) throw Error(out.error || 'Não foi possível concluir a operação.');
}

function decodeUrlBase64(input: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (input.length % 4)) % 4),
    binary = atob((input + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
}

async function reg(): Promise<ServiceWorkerRegistration> {
  if (!supported())
    throw Error(
      'Este navegador não permite instalar aplicativos web. Abra o site pelo navegador do celular com HTTPS.',
    );
  return registration || navigator.serviceWorker.ready;
}

async function install(): Promise<void> {
  if (standalone()) {
    update('O Clyriva já está instalado neste dispositivo.');
    return;
  }
  if (deferred) {
    const prompt = deferred;
    deferred = null;
    void prompt.prompt();
    const choice = await prompt.userChoice;
    update(
      choice.outcome === 'accepted'
        ? 'Instalação iniciada. Abra o Clyriva pelo ícone criado na tela inicial.'
        : 'Você pode instalar mais tarde pelo menu do navegador.',
    );
    return;
  }
  if (ios)
    update(
      'No iPhone: abra este site pelo Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”. Depois, abra o ícone Clyriva e ative as notificações.',
    );
  else
    update(
      'Abra o menu do Chrome ou Edge e escolha “Instalar app” ou “Adicionar à tela inicial”. Depois abra o Clyriva pelo novo ícone.',
    );
}

/** Executa uma ação do diálogo bloqueando o botão correspondente enquanto ela roda. */
async function guarded(action: PwaAction, fallback: string, run: () => Promise<void>) {
  pwaBusy.set({ ...pwaBusy.get(), [action]: true });
  try {
    await run();
  } catch (e) {
    update(errorInfo(e).message || fallback);
  } finally {
    pwaBusy.set({ ...pwaBusy.get(), [action]: false });
  }
}

const enable = () =>
  guarded('enable', 'Não foi possível ativar notificações.', async () => {
    if (!window.ClyrivaPwaSession?.isAdmin?.())
      throw Error('Primeiro entre com sua conta de administrador.');
    if (!('Notification' in window) || !('PushManager' in window))
      throw Error(
        'Este navegador não suporta notificações web. Atualize o navegador ou use outro compatível.',
      );
    if (ios && !standalone())
      throw Error(
        'No iPhone, primeiro adicione o Clyriva à Tela de Início e abra o aplicativo pelo ícone para autorizar notificações.',
      );
    // Importante no iOS: a permissão precisa ser solicitada na própria interação com o botão.
    let permission = Notification.permission;
    if (permission === 'default') permission = await Notification.requestPermission();
    if (permission !== 'granted')
      throw Error(
        'Notificações bloqueadas. Libere o Clyriva nas configurações de notificações do celular.',
      );
    const ready = await reg();
    const key: { publicKey?: string } = await fetch(base + '/public-key', {
      cache: 'no-store',
    }).then(async (r) => {
      if (!r.ok) throw Error('Serviço de notificações indisponível.');
      return r.json();
    });
    if (!key.publicKey) throw Error('Chave pública de notificações indisponível.');
    let sub = await ready.pushManager.getSubscription();
    if (!sub)
      sub = await ready.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeUrlBase64(key.publicKey),
      });
    await api('subscribe', { subscription: sub.toJSON() });
    update(
      'Notificações ativadas! Seus lembretes serão enviados ao celular, mesmo com o aplicativo fechado, conforme a disponibilidade do sistema e do dispositivo.',
    );
  });

const test = () =>
  guarded('test', 'Não foi possível enviar o teste.', async () => {
    const ready = await reg(),
      sub = await ready.pushManager.getSubscription();
    if (!sub) throw Error('Ative as notificações primeiro.');
    await api('test', { endpoint: sub.endpoint });
    update('Notificação de teste enviada. Confira os alertas do celular.');
  });

const disable = () =>
  guarded('disable', 'Não foi possível desativar.', async () => {
    const ready = await reg(),
      sub = await ready.pushManager.getSubscription();
    if (!sub) {
      update('Notificações já estão desativadas.');
      return;
    }
    await api('unsubscribe', { endpoint: sub.endpoint });
    await sub.unsubscribe();
    update('Notificações desativadas neste dispositivo. Você pode ativar novamente quando quiser.');
  });

function initialStatus(): string {
  if (standalone()) return 'Clyriva instalado. Você já pode ativar as notificações.';
  if (ios)
    return 'No iPhone, instale pela opção “Adicionar à Tela de Início”. Notificações são ativadas dentro do app instalado.';
  return 'Instale o Clyriva no celular e, depois de entrar, ative os alertas.';
}

function open(): void {
  if (dialog.get() === 'pwa') return;
  pwaStatus.set(initialStatus());
  dialog.set('pwa');
}

window.ClyrivaPwa = Object.freeze({ open });

export { disable, enable, install, open, pwaBusy, pwaStatus, test, triggerLabel };
