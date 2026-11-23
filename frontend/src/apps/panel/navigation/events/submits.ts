import { formSubmit } from '../../forms/saveRecord.ts';
import { vaultEntrySave } from '../../vault/forms.ts';
import { vaultChangeMaster, vaultOperation, vaultSetup, vaultUnlock } from '../../vault/session.ts';

const vaultForms: Record<string, (form: HTMLFormElement) => Promise<void>> = {
  'vault-setup-form': vaultSetup,
  'vault-unlock-form': vaultUnlock,
  'vault-entry-form': vaultEntrySave,
  'vault-change-form': vaultChangeMaster,
};

/** Envio dos formulários do painel (registros e cofre). */
export function bindSubmits(): void {
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.id === 'edit-form') {
      e.preventDefault();
      void formSubmit(form);
    } else if (Object.hasOwn(vaultForms, form.id)) {
      e.preventDefault();
      void vaultOperation(() => vaultForms[form.id](form));
    }
  });
}
