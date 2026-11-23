import { $ } from './api.js';

const status = (sel, msg, err = false) => {
  const el = $(sel);
  if (el) {
    el.textContent = msg;
    el.classList.toggle('error', !!err);
  }
};

const safeDate = (x) =>
  /^\d{4}-\d{2}-\d{2}$/.test(String(x || ''))
    ? x.slice(8) + '/' + x.slice(5, 7) + '/' + x.slice(0, 4)
    : null;

function view(authenticated) {
  $('#login-area').classList.toggle('hidden', authenticated);
  $('#client-area').classList.toggle('hidden', !authenticated);
}

export { safeDate, status, view };
