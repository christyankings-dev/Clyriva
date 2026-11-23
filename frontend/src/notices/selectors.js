import { requests } from './state.js';

function company(id) {
  return requests.state.companies.find((c) => c.id === id)?.name || 'Empresa removida';
}

export { company };
