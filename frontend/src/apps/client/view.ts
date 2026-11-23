import { $, must } from '../../shared/lib/dom.ts';

const status = (selector: string, message: string, error = false): void => {
  const el = $(selector);
  if (el) {
    el.textContent = message;
    el.classList.toggle('error', error);
  }
};

const safeDate = (value: unknown): string | null => {
  const text = String(value || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? text.slice(8) + '/' + text.slice(5, 7) + '/' + text.slice(0, 4)
    : null;
};

function view(authenticated: boolean): void {
  must('#login-area').classList.toggle('hidden', authenticated);
  must('#client-area').classList.toggle('hidden', !authenticated);
}

export { safeDate, status, view };
