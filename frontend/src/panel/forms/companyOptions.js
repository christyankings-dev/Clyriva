import { panelWorkspace } from '../state/workspace.js';
import { esc } from '../shared/format.js';

const companyOptions = (selected, all = true) =>
  `${all ? '<option value="all">Todos os clientes</option>' : ''}${panelWorkspace.data.clients.map((c) => `<option value="${esc(c.id)}" ${c.id === selected ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}`;

export { companyOptions };
