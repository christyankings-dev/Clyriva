import { hideModal } from '../components/ModalHost/index.tsx';
import { cancelCnpjLookup } from '../clients/cnpj/lookup.ts';

function closeModal(): void {
  cancelCnpjLookup();
  hideModal();
}

export { closeModal };
