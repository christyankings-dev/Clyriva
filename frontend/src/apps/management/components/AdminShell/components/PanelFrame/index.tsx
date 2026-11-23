import { memo } from 'react';
import { state } from '../../../../session/state.ts';

/** O iframe guarda a referência na sessão: a ponte do painel só aceita este `contentWindow`. */
function register(frame: HTMLIFrameElement | null): void {
  state.frame = frame;
}

export const PanelFrame = memo(function PanelFrame() {
  return (
    <>
      <div className="admin-info">
        Carteira privada. Seus registros são sincronizados com o banco de dados.
      </div>
      <iframe
        ref={register}
        id="admin-iframe"
        className="admin-view"
        title="Painel administrativo Clyriva"
        src="admin.html"
      />
    </>
  );
});
