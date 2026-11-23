import { $ } from './api.js';

const status = (sel, msg, err = false) => {
  const el = $(sel);
  if (el) {
    el.textContent = msg;
    el.classList.toggle('error', err);
  }
};

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}

function fmtDate(v) {
  return v
    ? String(v).slice(8, 10) + '/' + String(v).slice(5, 7) + '/' + String(v).slice(0, 4)
    : 'Sem prazo';
}

function fmtMoney(cents) {
  return (
    'R$ ' +
    (Number(cents) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function moneyForInput(cents) {
  return (Number(cents) / 100).toFixed(2);
}

export { el, fmtDate, fmtMoney, moneyForInput, status };
