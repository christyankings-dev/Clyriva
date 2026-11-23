import { Field } from '../../forms/fields.tsx';
import { Modal, ModalFoot } from '../Modal/index.tsx';

export function VaultChangeDialog() {
  return (
    <Modal
      title="Alterar senha-mestra"
      description="O cofre será criptografado novamente com a nova senha."
    >
      <form id="vault-change-form">
        <div className="modal-fields">
          <Field label="Nova senha-mestra" name="master" type="password" required wide />
          <Field
            label="Confirme a nova senha-mestra"
            name="confirm"
            type="password"
            required
            wide
          />
        </div>
        <ModalFoot submit="Atualizar senha-mestra" />
      </form>
    </Modal>
  );
}
