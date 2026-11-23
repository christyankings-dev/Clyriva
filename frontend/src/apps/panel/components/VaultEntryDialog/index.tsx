import { useLayoutEffect, useState } from 'react';
import { clientOpts, Field } from '../../forms/fields.tsx';
import { vaultSession } from '../../vault/session.ts';
import { Modal, ModalFoot } from '../Modal/index.tsx';

function PasswordInput({ value }: { value: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field wide">
      <label htmlFor="vault-password">Senha do portal</label>
      <div className="secret-input">
        <input
          id="vault-password"
          type={visible ? 'text' : 'password'}
          name="password"
          defaultValue={value}
          autoComplete="off"
          spellCheck={false}
          placeholder="Senha guardada no cofre"
        />
        <button type="button" className="btn" onClick={() => setVisible(!visible)}>
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
    </div>
  );
}

export function VaultEntryDialog({ editId, clientId }: { editId: string; clientId: string }) {
  const access = vaultSession.vaultData?.access.find((x) => x.id === editId);
  useLayoutEffect(() => {
    document.querySelector<HTMLInputElement>('#vault-entry-form [name=label]')?.focus();
  }, []);
  return (
    <Modal
      title={access ? 'Editar acesso' : 'Novo acesso protegido'}
      description="E-mail/login, senha, portal e notas serão guardados no cofre criptografado."
    >
      <form id="vault-entry-form" data-edit={access?.id || ''}>
        <div className="modal-fields">
          <Field
            label="Cliente"
            name="clientId"
            value={clientId}
            options={clientOpts()}
            required
            wide
          />
          <Field
            label="Serviço / Portal"
            name="label"
            value={access?.label || ''}
            required
            placeholder="Ex.: Portal NFS-e, e-CAC, Conta Google"
          />
          <Field
            label="E-mail / usuário de login"
            name="username"
            value={access?.username || ''}
            placeholder="login@empresa.com"
          />
          <Field
            label="Endereço do portal (URL)"
            name="site"
            value={access?.site || ''}
            wide
            placeholder="https://..."
          />
          <PasswordInput value={access?.password || ''} />
          <Field
            label="Observações do acesso (protegidas)"
            name="notes"
            value={access?.notes || ''}
            area
            wide
          />
        </div>
        <ModalFoot submit="Salvar no cofre" />
      </form>
    </Modal>
  );
}
