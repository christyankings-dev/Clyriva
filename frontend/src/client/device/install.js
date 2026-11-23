import { ios, standalone } from './platform.js';
import { clientActivity } from './state.js';

function installFeedback(message) {
  for (const el of document.querySelectorAll('[data-install-feedback]')) el.textContent = message;
}

function updateInstall() {
  for (const el of document.querySelectorAll('[data-install-area]'))
    el.classList.toggle('hidden', standalone());
}

async function install() {
  if (standalone()) {
    updateInstall();
    return;
  }
  const prompt = clientActivity.deferred;
  if (prompt) {
    clientActivity.deferred = null;
    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      installFeedback(
        result.outcome === 'accepted'
          ? 'Instalação solicitada. Abra o ícone Clyriva Clientes na tela inicial.'
          : 'Você pode instalar depois pelo menu do navegador.',
      );
      return;
    } catch {
      /* O menu do navegador também permite instalar. */
    }
  }
  installFeedback(
    ios
      ? 'No Safari, toque em Compartilhar → Adicionar à Tela de Início. Depois, abra o ícone Clyriva Clientes.'
      : 'No Chrome, abra o menu ⋮ → Instalar app ou Adicionar à tela inicial. Depois, abra o ícone Clyriva Clientes.',
  );
}

export { install, installFeedback, updateInstall };
