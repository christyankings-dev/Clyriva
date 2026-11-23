/** Elemento que originou o evento, ou `null` (ex.: o alvo é o próprio `document`). */
export const targetOf = (e: Event): HTMLElement | null =>
  e.target instanceof HTMLElement ? e.target : null;

/** Campo de formulário pelo atributo `name`. */
export function formField(
  form: HTMLFormElement,
  name: string,
): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
  const el = form.elements.namedItem(name);
  return el instanceof RadioNodeList ? null : (el as HTMLInputElement | null);
}
