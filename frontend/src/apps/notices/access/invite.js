import { $, api } from '../api.js';
import { el, status } from '../ui.js';
import { requests } from '../state.js';
import { refresh } from '../records/refresh.js';

function temporaryAccess(email, secret, url, created = true) {
  const box = $('#invite-result');
  box.replaceChildren();
  const good = el('div', null, 'notice');
  good.append(el('strong', created ? 'Senha temporária gerada.' : 'Acesso autorizado.'));
  good.append(el('p', 'E-mail: ' + email));
  const copy = el(
    'button',
    secret ? 'Copiar credenciais para enviar em particular' : 'Copiar instruções de acesso',
    'btn',
  );
  copy.type = 'button';
  copy.addEventListener('click', async () => {
    const lines = [
      'Acesse o Clyriva Clientes pelo celular.',
      url,
      'E-mail: ' + email,
      secret ? 'Senha provisória: ' + secret : 'Use sua senha atual.',
      'Toque em “Instalar no celular” e abra o aplicativo pelo ícone. Entre, ative as notificações e toque em “Enviar notificação de teste”.',
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      copy.textContent = 'Acesso copiado';
    } catch {
      status(
        '#admin-feedback',
        'A cópia automática falhou. Use o link do aplicativo e os dados de acesso desta tela.',
        true,
      );
    }
  });
  good.append(copy);
  if (secret) {
    const reveal = el('button', 'Mostrar senha por 30 segundos', 'btn');
    reveal.type = 'button';
    reveal.style.margin = '8px';
    reveal.addEventListener('click', () => {
      let display = good.querySelector('.temporary-secret');
      if (display) display.remove();
      display = el('code', secret, 'temporary-secret');
      display.style.cssText = 'display:block;overflow-wrap:anywhere;margin-top:9px;';
      good.append(display);
      const current = display;
      setTimeout(() => current.remove(), 30000);
    });
    good.append(reveal);
    good.append(
      el(
        'p',
        'Copie o acesso para enviar por canal privado. A senha pode ser exibida temporariamente se necessário.',
        'small',
      ),
    );
  } else
    good.append(
      el(
        'p',
        'O cliente utiliza sua senha existente. Se precisar, use Redefinir senha no acesso autorizado.',
        'small',
      ),
    );
  box.append(good);
  setTimeout(() => {
    if (box.contains(good)) {
      box.replaceChildren();
      box.append(el('p', 'Dados temporários ocultados por segurança.', 'small'));
    }
  }, 120000);
}

async function invite(e) {
  e.preventDefault();
  if (requests.busy) return;
  requests.busy = true;
  const form = e.target,
    b = form.querySelector('button[type="submit"]');
  b.disabled = true;
  status('#invite-result', 'Criando acesso…');
  try {
    const data = Object.fromEntries(new FormData(form));
    const value = await api('invite', data);
    temporaryAccess(value.email, value.temporaryPassword, value.loginUrl, value.created);
    await refresh();
  } catch (err) {
    status('#invite-result', err.message, true);
  } finally {
    requests.busy = false;
    b.disabled = false;
  }
}

export { invite, temporaryAccess };
