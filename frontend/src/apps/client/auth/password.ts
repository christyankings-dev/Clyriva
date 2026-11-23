import { must } from '../../../shared/lib/dom.ts';
import { errorInfo } from '../../../shared/lib/errors.ts';
import { status } from '../view.ts';
import { sb } from '../api.ts';

async function changePassword(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  const f = e.currentTarget as HTMLFormElement,
    first = (f.elements.namedItem('newPassword') as HTMLInputElement).value,
    second = (f.elements.namedItem('confirmPassword') as HTMLInputElement).value,
    button = must<HTMLButtonElement>('button[type=submit]', f);
  if (first.length < 12 || first !== second)
    return status(
      '#client-feedback',
      'Confira a senha de 12 ou mais caracteres e a confirmação.',
      true,
    );
  button.disabled = true;
  try {
    const { error } = await sb.auth.updateUser({
      password: first,
    });
    if (error) throw error;
    f.reset();
    status('#client-feedback', 'Senha alterada com sucesso.');
  } catch (err) {
    status('#client-feedback', errorInfo(err).message || 'Não foi possível alterar a senha.', true);
  } finally {
    button.disabled = false;
  }
}

export { changePassword };
