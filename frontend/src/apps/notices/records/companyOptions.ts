import { $ } from '../../../shared/lib/dom.ts';
import type { AdminCompany } from '../types.ts';

function option(value: string, label: string): HTMLOptionElement {
  const node = document.createElement('option');
  node.textContent = label;
  node.value = value;
  return node;
}

/** Atualiza os seletores de empresa preservando a escolha atual quando ela ainda existe. */
function fillCompanyOptions(active: AdminCompany[]): void {
  for (const select of document.querySelectorAll<HTMLSelectElement>('.company-select')) {
    const old = select.value;
    select.replaceChildren(
      option('', 'Selecione a empresa'),
      ...active.map((c) => option(c.id, c.name)),
    );
    if (active.some((x) => x.id === old)) select.value = old;
  }
  const clientFilter = $<HTMLSelectElement>('#billing-client-filter');
  if (clientFilter) {
    const selected = clientFilter.value;
    clientFilter.replaceChildren(
      option('all', 'Todas as empresas'),
      ...active.map((c) => option(c.id, c.name)),
    );
    clientFilter.value = active.some((c) => c.id === selected) ? selected : 'all';
  }
}

export { fillCompanyOptions };
