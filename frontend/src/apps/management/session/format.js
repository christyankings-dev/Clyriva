import { core } from './config.js';

const blank = core.empty;

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c],
  );

const ym = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
};

const errMsg = (e) => e?.message || 'Não foi possível concluir esta operação.';

export { blank, errMsg, esc, ym };
