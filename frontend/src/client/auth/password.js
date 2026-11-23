import { status } from '../view.js';
import { sb } from '../api.js';

async function changePassword(e) {
  e.preventDefault();
  const f = e.currentTarget,
    first = f.elements.newPassword.value,
    second = f.elements.confirmPassword.value,
    button = f.querySelector('button[type=submit]');
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
    status('#client-feedback', err.message || 'Não foi possível alterar a senha.', true);
  } finally {
    button.disabled = false;
  }
}

export { changePassword };
