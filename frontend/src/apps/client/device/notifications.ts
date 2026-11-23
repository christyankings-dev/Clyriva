import { clientDevice, pushReceipt } from './state.ts';
import { lockDevice, renderDevice } from './feedback.ts';
import { status } from '../view.ts';
import {
  currentDevice,
  decodeBase64,
  legacyDevice,
  ready,
  refreshPushPreference,
  unmetRequirement,
} from './registration.ts';
import { must } from '../../../shared/lib/dom.ts';
import { errorInfo } from '../../../shared/lib/errors.ts';
import { api, config, sb } from '../api.ts';
import { showTest } from './testReceipt.ts';
import type { PushTestRow } from '../../../shared/types/bridges.ts';

async function enable(): Promise<void> {
  if (clientDevice.pushBusy) return;
  const version = clientDevice.screenVersion;
  clientDevice.deviceVersion++;
  lockDevice(true);
  status('#push-feedback', '');
  try {
    const problem = unmetRequirement();
    if (problem) throw Error(problem);
    // O iOS exige que o pedido de permissão comece no gesto do usuário.
    let permission = Notification.permission;
    if (permission === 'default') permission = await Notification.requestPermission();
    if (permission !== 'granted')
      throw Error(
        'Permissão não concedida. Confira as configurações de notificações deste aparelho.',
      );
    const worker = await ready(),
      device = await currentDevice(worker);
    let sub = device.sub;
    const subscribe = async () => {
      const response = await fetch(config.supabaseUrl + '/functions/v1/clyriva-push/public-key', {
        cache: 'no-store',
      });
      if (!response.ok)
        throw Error('O serviço de notificações está indisponível. Tente novamente.');
      const { publicKey } = await response.json();
      return worker.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeBase64(publicKey),
      });
    };
    if (!sub) sub = await subscribe();
    const showAmount = must<HTMLInputElement>('#client-show-amount').checked;
    const save = (sub: PushSubscription) =>
      api('client-subscribe', {
        subscription: sub.toJSON(),
        showAmount,
      });
    if (version !== clientDevice.screenVersion) return;
    try {
      await save(sub);
    } catch (error) {
      if (errorInfo(error).status !== 409 || device.preference.enabled) throw error;
      // Uma assinatura exclusiva de cliente pode ter sobrado de outra sessão neste navegador.
      if (!(await sub.unsubscribe())) throw error;
      sub = await subscribe();
      if (version !== clientDevice.screenVersion) return;
      await save(sub);
    }
    if (version === clientDevice.screenVersion) {
      clientDevice.lastDevice = sub;
      renderDevice(true, 'Notificações ativas. Você já pode testar este aparelho.');
      status(
        '#push-feedback',
        device.preference.enabled
          ? 'Preferência salva.'
          : 'Toque em “Enviar notificação de teste”.',
      );
    }
  } catch (e) {
    if (version === clientDevice.screenVersion)
      status('#push-feedback', errorInfo(e).message || 'Falha na ativação.', true);
  } finally {
    if (version === clientDevice.screenVersion) lockDevice(false);
  }
}

async function test(): Promise<void> {
  if (clientDevice.pushBusy) return;
  const version = clientDevice.screenVersion;
  let testId: string | null = null;
  lockDevice(true);
  status('#push-feedback', '');
  try {
    const problem = unmetRequirement();
    if (problem || Notification.permission !== 'granted') {
      renderDevice(false, problem || 'Autorize as notificações para fazer o teste.');
      throw Error(must('#device-status').textContent ?? '');
    }
    const { sub, preference } = await currentDevice(await ready());
    if (!sub || !preference.enabled) {
      renderDevice(false, 'Ative as notificações para testar este aparelho.');
      throw Error('Este aparelho ainda não está inscrito.');
    }
    const {
      data: { session },
    } = await sb.auth.getSession();
    if (version !== clientDevice.screenVersion) return;
    if (pushReceipt.latestTest && Date.now() - pushReceipt.latestTest.started < 30000)
      throw Error('Aguarde 30 segundos entre os testes.');
    testId = crypto.randomUUID();
    const row: PushTestRow = {
      id: testId,
      owner: session?.user?.id || null,
      started: Date.now(),
      state: 'requested',
    };
    showTest(row);
    if (row.owner) await ClyrivaPushTest.start(row).catch(() => {});
    if (version !== clientDevice.screenVersion) return;
    const reply = await api<{ testId?: string }>('client-test', {
      endpoint: sub.endpoint,
      testId,
    });
    const state = reply.testId === testId ? 'accepted' : 'legacy';
    const saved = await ClyrivaPushTest.mark(testId, state).catch(() => null);
    if (
      version === clientDevice.screenVersion &&
      pushReceipt.latestTest?.id === testId &&
      pushReceipt.latestTest.state !== 'shown'
    ) {
      showTest(
        saved?.id === testId
          ? saved
          : {
              ...row,
              state,
            },
      );
    }
  } catch (e) {
    const failure = errorInfo(e);
    if (version !== clientDevice.screenVersion) return;
    // Uma resposta perdida pode chegar depois do push. Preservar uma confirmação local nesse caso.
    if (pushReceipt.latestTest?.id === testId && pushReceipt.latestTest.state === 'shown') return;
    if (testId && failure.status && failure.status < 500) {
      await ClyrivaPushTest.forget(testId).catch(() => {});
      if (version !== clientDevice.screenVersion) return;
      if (pushReceipt.latestTest?.id === testId) showTest(null);
    }
    status('#push-feedback', failure.message || 'Falha ao enviar o teste.', true);
    if (failure.status === 404 || failure.status === 502) refreshPushPreference();
  } finally {
    if (version === clientDevice.screenVersion) lockDevice(false);
  }
}

async function disconnectDevice(): Promise<string> {
  // A inscrição da gestão pode ocupar o escopo raiz. Só remover ali a inscrição confirmada para o cliente.
  const active = await ready(),
    dedicated = await active.pushManager.getSubscription();
  let legacy: PushSubscription | null | undefined = null,
    warning = '';
  try {
    legacy = (await legacyDevice())?.sub;
  } catch {
    legacy = clientDevice.lastDevice;
    warning =
      'Não foi possível conferir uma inscrição antiga. Verifique as permissões do aparelho.';
  }
  const all = new Map(
    [dedicated, legacy]
      .filter((sub): sub is PushSubscription => Boolean(sub))
      .map((sub) => [sub.endpoint, sub] as const),
  );
  for (const sub of all.values()) {
    try {
      await api('client-unsubscribe', {
        endpoint: sub.endpoint,
      });
    } catch {
      warning = 'Não foi possível confirmar a remoção no servidor.';
    }
    try {
      if (!(await sub.unsubscribe()))
        warning = 'Confira se as notificações foram desativadas nas configurações do aparelho.';
    } catch {
      warning = 'Confira as permissões de notificação nas configurações do aparelho.';
    }
  }
  return warning;
}

async function disable(): Promise<void> {
  if (clientDevice.pushBusy) return;
  const version = clientDevice.screenVersion;
  clientDevice.deviceVersion++;
  lockDevice(true);
  try {
    const warning = await disconnectDevice();
    if (version !== clientDevice.screenVersion) return;
    clientDevice.lastDevice = null;
    renderDevice(false, 'Notificações desativadas neste aparelho.');
    status('#push-feedback', warning || 'Você pode ativá-las novamente quando quiser.', !!warning);
    if (warning) refreshPushPreference();
  } catch (e) {
    if (version === clientDevice.screenVersion)
      status('#push-feedback', errorInfo(e).message, true);
  } finally {
    if (version === clientDevice.screenVersion) lockDevice(false);
  }
}

export { disable, disconnectDevice, enable, test };
