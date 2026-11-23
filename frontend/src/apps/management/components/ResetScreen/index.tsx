import { useState, type FormEvent } from 'react';
import { routeUser } from '../../auth/router.ts';
import { sb } from '../../session/config.ts';
import { errMsg } from '../../session/format.ts';
import { statusMessage } from '../../session/screen.ts';
import { recovery, redirectURL } from '../../session/state.ts';
import { AuthFeedbackMessage } from '../AuthFeedback/index.tsx';
import { LoginLayout } from '../LoginScreen/index.tsx';

export function ResetScreen() {
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = new FormData(e.currentTarget).get('password');
    setBusy(true);
    try {
      if (!sb) throw Error('Autenticação não configurada.');
      const result = await sb.auth.updateUser({ password: String(value ?? '') });
      if (result.error) throw result.error;
      recovery.recovering = false;
      history.replaceState({}, '', redirectURL());
      await routeUser();
    } catch (err) {
      statusMessage(errMsg(err), 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <LoginLayout>
      <div className="login-card">
        <span className="eyebrow">Segurança</span>
        <h2>Definir nova senha</h2>
        <p style={{ margin: '10px 0 22px' }}>
          Você acessou um link de recuperação. Defina uma senha nova.
        </p>
        <form id="reset-form" onSubmit={save}>
          <label className="form-label">
            Nova senha
            <input
              className="field"
              name="password"
              type="password"
              minLength={12}
              autoComplete="new-password"
              required
            />
          </label>
          <button className="button" disabled={busy}>
            Salvar nova senha
          </button>
        </form>
        <AuthFeedbackMessage live={false} />
      </div>
    </LoginLayout>
  );
}
