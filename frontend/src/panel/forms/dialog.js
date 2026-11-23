import { cancelCnpjLookup } from '../clients/cnpj.js';
import { $ } from '../shared/format.js';

function closeModal() {
  cancelCnpjLookup();
  $('#modal-root').innerHTML = '';
}

export { closeModal };
