import { ios, standalone } from './platform.ts';
import { clientActivity } from './state.ts';

function installFeedback(message: string): void {
  for (const el of document.querySelectorAll('[data-install-feedback]')) el.textContent = message;
}

function updateInstall(): void {
  for (const el of document.querySelectorAll('[data-install-area]'))
    el.classList.toggle('hidden', standalone());
}

async function install(): Promise<void> {
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
