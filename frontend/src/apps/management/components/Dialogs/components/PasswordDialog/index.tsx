import { useState, type FormEvent } from 'react';
import { sb } from '../../../../session/config.ts';
import { errMsg } from '../../../../session/format.ts';
import { dialog } from '../../../../session/screen.ts';

const overlay = {
  position: 'fixed',
  zIndex: 999999,
  inset: 0,
  background: 'rgba(7,26,38,.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
} as const;

const panel = {
  width: '100%',
  maxWidth: '390px',
  padding: '24px',
  borderRadius: '16px',
  background: 'white',
  color: '#183b42',
  boxSizing: 'border-box',
} as const;

const input = {
  boxSizing: 'border-box',
  width: '100%',
  padding: '11px',
  margin: '7px 0 14px',
} as const;

const close = (): void => dialog.set(null);

export function PasswordDialog() {
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      data = new FormData(form),
      pass = String(data.get('newpass') ?? ''),
      other = String(data.get('repeatpass') ?? '');
    if (pass !== other) {
      setFeedback('As senhas não são iguais.');
      return;
    }
    setBusy(true);
    try {
      if (!sb) throw Error('Autenticação não configurada.');
      const { error } = await sb.auth.updateUser({ password: pass });
      if (error) throw error;
      setFeedback('Senha alterada com sucesso.');
      form.reset();
      setTimeout(close, 1100);
    } catch (err) {
      setFeedback('Erro: ' + errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="password-dialog" style={overlay}>
      <section style={panel}>
        <h2>Alterar minha senha</h2>
        <p>Informe uma nova senha de 12 caracteres ou mais.</p>
        <form id="password-change-form" onSubmit={save}>
          <label>
            Nova senha{' '}
            <input
              name="newpass"
              type="password"
              minLength={12}
              autoComplete="new-password"
              required
              style={input}
            />
          </label>
          <label>
            Repita a senha{' '}
            <input
              name="repeatpass"
              type="password"
              minLength={12}
              autoComplete="new-password"
              required
              style={input}
            />
          </label>
          <div id="password-change-feedback" role="status">
            {feedback}
          </div>
          <button type="submit" className="button" disabled={busy}>
            Salvar nova senha
          </button>
          <button
            type="button"
            className="button secondary"
            id="password-change-close"
            onClick={close}
          >
            Cancelar
          </button>
        </form>
      </section>
    </div>
  );
}
