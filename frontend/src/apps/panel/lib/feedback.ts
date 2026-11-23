import { $ } from './format.ts';

/** Aviso rápido no canto da tela (some sozinho). Usa só textContent. */
function toast(message: string, bad = false): void {
  const t = document.createElement('div');
  t.className = 'toast' + (bad ? ' bad' : '');
  t.textContent = message;
  $('#toast-root')?.append(t);
  setTimeout(() => t.remove(), 3900);
}

export { toast };
