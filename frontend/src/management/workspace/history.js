import { epoch, sessionVersion, state } from '../session/state.js';
import { $, sb } from '../session/config.js';
import { errMsg, esc } from '../session/format.js';
import { loadAdmin } from './load.js';

async function showHistory() {
  if (state.mode !== 'admin' || state.saving || !sb || $('#history-dialog')) return;
  const wrap = document.createElement('div');
  wrap.id = 'history-dialog';
  wrap.style.cssText =
    'position:fixed;z-index:10000;inset:0;background:rgba(7,26,38,.7);display:grid;place-items:center;padding:16px';
  wrap.setAttribute('role', 'presentation');
  wrap.innerHTML =
    '<section role="dialog" aria-modal="true" aria-label="Histórico da carteira" style="background:#fff;color:#193744;width:min(100%,650px);max-height:85vh;overflow:auto;border-radius:16px;padding:28px;box-shadow:0 16px 45px #0003"><h2>Histórico de alterações</h2><p>As versões anteriores podem ser restauradas. A restauração gera uma nova revisão, sem apagar o histórico.</p><div id="history-content" role="status">Carregando versões…</div><button class="button secondary" type="button" id="history-close" style="margin-top:20px">Fechar</button></section>';
  document.body.append(wrap);
  const previous = document.activeElement;
  const close = () => {
    wrap.remove();
    previous?.focus?.();
  };
  wrap.querySelector('#history-close').onclick = close;
  const escapeKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };
  wrap.addEventListener('keydown', escapeKey);
  wrap.querySelector('#history-close').focus();
  try {
    const res = await sb
      .from('clyriva_workspace_history')
      .select('revision,saved_at,saved_by')
      .eq('admin_id', state.user.id)
      .order('revision', {
        ascending: false,
      })
      .limit(25);
    if (res.error) throw res.error;
    const el = wrap.querySelector('#history-content');
    if (!el) return;
    if (!res.data?.length) {
      el.textContent =
        'Nenhuma versão anterior. As próximas alterações serão registradas automaticamente.';
      return;
    }
    el.innerHTML =
      '<div style="display:grid;gap:9px;margin-top:18px">' +
      res.data
        .map(
          (row) =>
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #e3eaec;border-radius:9px;padding:12px"><span>Revisão ' +
            esc(row.revision) +
            ' · ' +
            esc(new Date(row.saved_at).toLocaleString('pt-BR')) +
            '</span><button type="button" class="button secondary sm" data-revision="' +
            esc(row.revision) +
            '">Restaurar</button></div>',
        )
        .join('') +
      '</div>';
    el.querySelectorAll('[data-revision]').forEach(
      (button) =>
        (button.onclick = async () => {
          if (
            !confirm(
              'Restaurar a revisão ' +
                button.dataset.revision +
                '? Os dados atuais serão guardados no histórico antes da restauração.',
            )
          )
            return;
          button.disabled = true;
          const out = await sb.rpc('clyriva_restore_revision', {
            p_target: Number(button.dataset.revision),
            p_expected: state.revision,
          });
          if (out.error) {
            alert('Restauração não concluída: ' + errMsg(out.error));
            button.disabled = false;
            return;
          }
          close();
          await loadAdmin(state.user, epoch, sessionVersion.routeGeneration);
          alert('Revisão restaurada. Confira os registros.');
        }),
    );
  } catch (e) {
    const el = wrap.querySelector('#history-content');
    if (el) el.textContent = 'Histórico indisponível. ' + errMsg(e);
  }
}

export { showHistory };
