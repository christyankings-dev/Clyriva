import { useEffect, useState } from 'react';
import { status } from '../../ui.ts';
import type { TemporaryAccessProps } from './types.ts';

const SECRET_VISIBLE_MS = 30000;
const RESULT_VISIBLE_MS = 120000;

export function TemporaryAccess({ email, secret, url, created = true }: TemporaryAccessProps) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHidden(true), RESULT_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!revealed) return;
    const timer = setTimeout(() => setRevealed(false), SECRET_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [revealed]);

  async function copy() {
    const lines = [
      'Acesse o Clyriva Clientes pelo celular.',
      url,
      'E-mail: ' + email,
      secret ? 'Senha provisória: ' + secret : 'Use sua senha atual.',
      'Toque em “Instalar no celular” e abra o aplicativo pelo ícone. Entre, ative as notificações e toque em “Enviar notificação de teste”.',
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
    } catch {
      status(
        '#admin-feedback',
        'A cópia automática falhou. Use o link do aplicativo e os dados de acesso desta tela.',
        true,
      );
    }
  }

  if (hidden) return <p className="small">Dados temporários ocultados por segurança.</p>;
  return (
    <div className="notice">
      <strong>{created ? 'Senha temporária gerada.' : 'Acesso autorizado.'}</strong>
      <p>E-mail: {email}</p>
      <button type="button" className="btn" onClick={copy}>
        {copied
          ? 'Acesso copiado'
          : secret
            ? 'Copiar credenciais para enviar em particular'
            : 'Copiar instruções de acesso'}
      </button>
      {secret ? (
        <>
          <button
            type="button"
            className="btn"
            style={{ margin: '8px' }}
            onClick={() => setRevealed(true)}
          >
            Mostrar senha por 30 segundos
          </button>
          <p className="small">
            Copie o acesso para enviar por canal privado. A senha pode ser exibida temporariamente
            se necessário.
          </p>
          {revealed && (
            <code
              className="temporary-secret"
              style={{ display: 'block', overflowWrap: 'anywhere', marginTop: '9px' }}
            >
              {secret}
            </code>
          )}
        </>
      ) : (
        <p className="small">
          O cliente utiliza sua senha existente. Se precisar, use Redefinir senha no acesso
          autorizado.
        </p>
      )}
    </div>
  );
}
