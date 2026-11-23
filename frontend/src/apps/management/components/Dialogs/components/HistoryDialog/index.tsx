import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { sb } from '../../../../session/config.ts';
import { errMsg } from '../../../../session/format.ts';
import { dialog } from '../../../../session/screen.ts';
import { currentEpoch, sessionVersion, state } from '../../../../session/state.ts';
import { loadAdmin } from '../../../../workspace/load.ts';
import type { HistoryRow, HistoryState } from './types.ts';

const overlay = {
  position: 'fixed',
  zIndex: 10000,
  inset: 0,
  background: 'rgba(7,26,38,.7)',
  display: 'grid',
  placeItems: 'center',
  padding: '16px',
} as const;

const panel = {
  background: '#fff',
  color: '#193744',
  width: 'min(100%,650px)',
  maxHeight: '85vh',
  overflow: 'auto',
  borderRadius: '16px',
  padding: '28px',
  boxShadow: '0 16px 45px #0003',
} as const;

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  border: '1px solid #e3eaec',
  borderRadius: '9px',
  padding: '12px',
} as const;

const close = (): void => dialog.set(null);

export function HistoryDialog() {
  const closeButton = useRef<HTMLButtonElement>(null);
  const [history, setHistory] = useState<HistoryState>({ kind: 'loading' });
  const [restoring, setRestoring] = useState<number | null>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        if (!sb || !state.user) throw Error('Sessão administrativa indisponível.');
        const res = await sb
          .from('clyriva_workspace_history')
          .select('revision,saved_at,saved_by')
          .eq('admin_id', state.user.id)
          .order('revision', { ascending: false })
          .limit(25);
        if (res.error) throw res.error;
        const rows = (res.data ?? []) as HistoryRow[];
        if (live) setHistory(rows.length ? { kind: 'ready', rows } : { kind: 'empty' });
      } catch (e) {
        if (live) setHistory({ kind: 'error', message: errMsg(e) });
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  async function restore(revision: number) {
    if (
      !confirm(
        'Restaurar a revisão ' +
          revision +
          '? Os dados atuais serão guardados no histórico antes da restauração.',
      )
    )
      return;
    if (!sb || !state.user) return;
    setRestoring(revision);
    const out = await sb.rpc('clyriva_restore_revision', {
      p_target: revision,
      p_expected: state.revision,
    });
    if (out.error) {
      alert('Restauração não concluída: ' + errMsg(out.error));
      setRestoring(null);
      return;
    }
    close();
    await loadAdmin(state.user, currentEpoch(), sessionVersion.routeGeneration);
    alert('Revisão restaurada. Confira os registros.');
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  return (
    <div id="history-dialog" role="presentation" style={overlay} onKeyDown={onKeyDown}>
      <section role="dialog" aria-modal="true" aria-label="Histórico da carteira" style={panel}>
        <h2>Histórico de alterações</h2>
        <p>
          As versões anteriores podem ser restauradas. A restauração gera uma nova revisão, sem
          apagar o histórico.
        </p>
        <div id="history-content" role="status">
          {history.kind === 'loading' && 'Carregando versões…'}
          {history.kind === 'empty' &&
            'Nenhuma versão anterior. As próximas alterações serão registradas automaticamente.'}
          {history.kind === 'error' && 'Histórico indisponível. ' + history.message}
          {history.kind === 'ready' && (
            <div style={{ display: 'grid', gap: '9px', marginTop: '18px' }}>
              {history.rows.map((row) => (
                <div key={row.revision} style={rowStyle}>
                  <span>
                    Revisão {row.revision} · {new Date(row.saved_at).toLocaleString('pt-BR')}
                  </span>
                  <button
                    type="button"
                    className="button secondary sm"
                    disabled={restoring === row.revision}
                    onClick={() => void restore(row.revision)}
                  >
                    Restaurar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          ref={closeButton}
          className="button secondary"
          type="button"
          id="history-close"
          style={{ marginTop: '20px' }}
          onClick={close}
        >
          Fechar
        </button>
      </section>
    </div>
  );
}
