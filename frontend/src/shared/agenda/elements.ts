function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function button(text: string, className?: string): HTMLButtonElement {
  const el = element('button', className, text);
  el.type = 'button';
  return el;
}

export { button, element };
