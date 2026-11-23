/** Busca opcional: retorna null quando o elemento não existe. */
export function $<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T | null {
  return root.querySelector<T>(selector);
}

/** Busca obrigatória: falha com uma mensagem clara se o HTML não tiver o elemento esperado. */
export function must<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw Error('Elemento não encontrado na página: ' + selector);
  return found;
}

/** Campo nomeado de um formulário (falha com mensagem clara se não existir). */
export function field<T extends HTMLElement = HTMLInputElement>(
  form: HTMLFormElement,
  name: string,
): T {
  const found = form.elements.namedItem(name);
  if (!(found instanceof HTMLElement)) throw Error('Campo não encontrado no formulário: ' + name);
  return found as T;
}
