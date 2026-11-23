import type { User } from '@supabase/supabase-js';
import { core, sb } from '../session/config.ts';
import { blank } from '../session/format.ts';
import { showAdmin } from '../session/screen.ts';
import { assertCurrent, sessionVersion, state } from '../session/state.ts';

interface LoadedWorkspace {
  revision: number;
  data?: unknown;
  vault?: unknown;
}

async function loadAdmin(_user: User, token: number, generation: number): Promise<void> {
  if (!sb) throw Error('Autenticação não configurada.');
  const res = await sb.rpc('clyriva_load');
  assertCurrent(token);
  if (generation !== sessionVersion.routeGeneration) return;
  if (res.error) throw res.error;
  const loaded = res.data as LoadedWorkspace | null;
  if (!loaded || !Number.isSafeInteger(loaded.revision))
    throw Error('Verifique o schema.sql e a confirmação do e-mail administrativo.');
  state.adminPayload = core.workspace(loaded.data ?? blank());
  state.vault = core.vault(loaded.vault);
  state.revision = loaded.revision;
  state.access = [];
  state.mode = 'admin';
  state.adminTab = 'panel';
  showAdmin();
}

export { loadAdmin };
