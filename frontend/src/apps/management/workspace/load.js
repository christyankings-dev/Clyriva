import { core, sb } from '../session/config.js';
import { assertCurrent, sessionVersion, state } from '../session/state.js';
import { blank } from '../session/format.js';
import { renderAdmin } from '../layout/shell.js';

async function loadAdmin(user, token, generation) {
  const res = await sb.rpc('clyriva_load');
  assertCurrent(token);
  if (generation !== sessionVersion.routeGeneration) return;
  if (res.error) throw res.error;
  if (!res.data || !Number.isSafeInteger(res.data.revision))
    throw Error('Verifique o schema.sql e a confirmação do e-mail administrativo.');
  state.adminPayload = core.workspace(res.data.data ?? blank());
  state.vault = core.vault(res.data.vault);
  state.revision = res.data.revision;
  state.access = [];
  state.mode = 'admin';
  state.adminTab = 'panel';
  renderAdmin();
}

export { loadAdmin };
