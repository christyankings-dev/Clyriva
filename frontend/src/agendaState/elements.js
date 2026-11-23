function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function button(text, className) {
  const el = element('button', className, text);
  el.type = 'button';
  return el;
}

export { button, element };
