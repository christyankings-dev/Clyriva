import { useRef, useState, type FormEvent } from 'react';
import { routeUser } from '../../../../auth/router.ts';
import { configError, sb } from '../../../../session/config.ts';
import { errMsg } from '../../../../session/format.ts';
import { statusMessage } from '../../../../session/screen.ts';
import { recoveryRequest, redirectURL, state } from '../../../../session/state.ts';
import { AuthFeedbackMessage } from '../../../AuthFeedback/index.tsx';

/* Somente login privado. Cadastro e modo demonstração removidos da produção. */
export function LoginCard() {
  const email = useRef<HTMLInputElement>(null);
  const password = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sb)
      return statusMessage(
        configError || 'Para ativar logins reais, configure config.js e o banco de dados.',
        'warn',
      );
    const address = (email.current?.value ?? '').trim().toLowerCase(),
      secret = password.current?.value ?? '';
    if (state.authBusy) return;
    if (recoveryRequest.awaitingRecovery) {
      recoveryRequest.awaitingRecovery = false;
      history.replaceState({}, '', redirectURL());
    }
    state.authBusy = true;
    setBusy(true);
    try {
      const { error } = await sb.auth.signInWithPassword({ email: address, password: secret });
      if (error) throw error;
      await routeUser();
    } catch (err) {
      statusMessage('Falha no login: ' + errMsg(err), 'err');
    } finally {
      state.authBusy = false;
      setBusy(false);
    }
  }

  async function forgot() {
    if (!sb) return statusMessage('Configure o Supabase para recuperar senhas reais.', 'warn');
    const address = (email.current?.value ?? '').trim().toLowerCase();
    if (!address)
      return statusMessage('Informe seu e-mail no campo acima para receber o link.', 'warn');
    try {
      const { error } = await sb.auth.resetPasswordForEmail(address, {
        redirectTo: redirectURL() + '?recuperar=1',
      });
      statusMessage(
        error
          ? 'Não foi possível enviar: ' + error.message
          : 'Caso o e-mail esteja cadastrado, você receberá um link para redefinir a senha.',
        error ? 'err' : '',
      );
    } catch (e) {
      statusMessage(errMsg(e), 'err');
    }
  }

  return (
    <div className="login-card">
      <span className="eyebrow">Portal Clyriva</span>
      <h2>Acesse seu espaço</h2>
      <p>Entre com o e-mail e a senha da sua conta administrativa.</p>
      <form id="auth-form" onSubmit={signIn}>
        <div>
          <label className="form-label" htmlFor="login-email">
            Seu e-mail
          </label>
          <input
            ref={email}
            className="field"
            id="login-email"
            type="email"
            autoComplete="username"
            placeholder="seuemail@exemplo.com"
            required
          />
        </div>
        <div>
          <label className="form-label" htmlFor="login-pass">
            Senha de acesso
          </label>
          <input
            ref={password}
            className="field"
            id="login-pass"
            type="password"
            autoComplete="current-password"
            placeholder="Digite sua senha"
            required
          />
        </div>
        <button className="button" type="submit" disabled={busy}>
          {busy ? 'Validando acesso…' : 'Entrar na plataforma →'}
        </button>
      </form>
      <p style={{ textAlign: 'center', margin: '16px 0', fontSize: '13px' }}>
        Recebeu acesso como cliente? <a href="/cliente.html">Abrir Clyriva Clientes</a>
      </p>
      <div className="row between mt20">
        <button id="btn-forgot" className="sm-link" type="button" onClick={forgot}>
          Esqueci minha senha
        </button>
      </div>
      <AuthFeedbackMessage />
    </div>
  );
}
