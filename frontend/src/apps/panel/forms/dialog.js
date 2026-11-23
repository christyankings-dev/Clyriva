import { cancelCnpjLookup } from '../clients/cnpj.js';
import { $ } from '../lib/format.js';

function closeModal() {
  cancelCnpjLookup();
  $('#modal-root').innerHTML = '';
}

export { closeModal };
