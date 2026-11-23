import { signout } from '../../auth/router.ts';

interface AccessFailureProps {
  message: string;
  retry: () => void;
}

export function AccessFailure({ message, retry }: AccessFailureProps) {
  return (
    <div className="login-main" style={{ minHeight: '100vh' }}>
      <div className="login-card">
        <h2>Não foi possível carregar seu acesso</h2>
        <div className="notice err mt20">{message}</div>
        <button id="retry" className="button mt20" onClick={retry}>
          Tentar novamente
        </button>{' '}
        <button id="signout" className="button secondary mt20" onClick={() => void signout()}>
          Sair
        </button>
      </div>
    </div>
  );
}
