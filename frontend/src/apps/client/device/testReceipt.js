import { clientActivity, clientDevice, pushReceipt } from './state.js';
import { $, sb } from '../api.js';

function showTest(row) {
  pushReceipt.latestTest = row;
  clearTimeout(pushReceipt.testTimer);
  const result = $('#client-test-result');
  result.hidden = !row;
  if (!row) {
    result.textContent = '';
    return;
  }
  if (row.state === 'shown') {
    const shown = new Date(row.shownAt);
    const time = shown.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const when =
      shown.toDateString() === new Date().toDateString()
        ? 'às ' + time
        : 'em ' + shown.toLocaleDateString('pt-BR') + ' às ' + time;
    result.textContent =
      'Este aparelho confirmou a notificação de teste ' +
      when +
      '. Confira a central de notificações.';
    return;
  }
  if (row.state === 'legacy') {
    result.textContent =
      'O serviço aceitou o teste. Procure a notificação na central deste aparelho.';
    return;
  }
  const remaining = row.started + 45000 - Date.now();
  const accepted = row.state === 'accepted';
  if (remaining > 0) {
    result.textContent = accepted
      ? 'O serviço aceitou o teste. Aguardando a confirmação deste aparelho.'
      : 'Aguardando a confirmação do envio.';
    pushReceipt.testTimer = setTimeout(() => showTest(row), remaining);
  } else {
    result.textContent =
      (accepted ? 'O serviço aceitou o teste. ' : '') +
      'Este aparelho ainda não confirmou. Confira a conexão, a central de notificações e as permissões do Clyriva.';
  }
}

async function recoverTest() {
  if (!clientActivity.loaded) return;
  if (pushReceipt.latestTest && Date.now() - pushReceipt.latestTest.started >= 86400000)
    showTest(null);
  const version = clientDevice.screenVersion,
    prior = pushReceipt.latestTest?.id;
  try {
    const {
      data: { session },
    } = await sb.auth.getSession();
    if (!session?.user?.id) return;
    const saved = await ClyrivaPushTest.read(session.user.id);
    if (
      !saved ||
      !clientActivity.loaded ||
      clientDevice.screenVersion !== version ||
      pushReceipt.latestTest?.id !== prior
    )
      return;
    if (
      pushReceipt.latestTest &&
      (saved.started < pushReceipt.latestTest.started ||
        (saved.id === prior && pushReceipt.latestTest.state === 'shown'))
    )
      return;
    showTest(saved);
  } catch {
    /* Um aparelho sem armazenamento ainda pode confirmar com o app aberto. */
  }
}

function testDisplayed(event) {
  const message = event.data;
  if (
    !clientActivity.loaded ||
    event.origin !== location.origin ||
    event.source?.scriptURL !== location.origin + '/sw.js'
  )
    return;
  if (
    message?.type !== 'clyriva-test-shown' ||
    !pushReceipt.latestTest ||
    message.testId !== pushReceipt.latestTest.id
  )
    return;
  showTest({
    ...pushReceipt.latestTest,
    state: 'shown',
    shownAt: message.shownAt,
  });
}

export { recoverTest, showTest, testDisplayed };
