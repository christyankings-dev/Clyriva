import { $ } from './format.js';

function toast(message, bad = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (bad ? ' bad' : '');
  t.textContent = message;
  $('#toast-root').append(t);
  setTimeout(() => t.remove(), 3900);
}

export { toast };
