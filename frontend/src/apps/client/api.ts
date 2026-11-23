import { httpError } from '../../shared/lib/errors.ts';

const config = window.CLYRIVA_CONFIG || {};

const base = String(config.supabaseUrl || '').replace(/\/$/, '') + '/functions/v1/clyriva-client';

const sb = window.supabase.createClient(config.supabaseUrl ?? '', config.supabaseAnonKey ?? '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storageKey: 'clyriva-client-auth-v2',
    detectSessionInUrl: false,
  },
});

type ApiReply<T> = T & { ok: true };

async function api<T extends object = object>(
  action: string,
  data: object = {},
): Promise<ApiReply<T>> {
  const {
    data: { session },
    error,
  } = await sb.auth.getSession();
  if (error || !session?.access_token) throw Error('Entre novamente para continuar.');
  const r = await fetch(base + '/' + action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.supabaseAnonKey ?? '',
      Authorization: 'Bearer ' + session.access_token,
    },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  let result: { ok?: boolean; error?: string } = {};
  try {
    result = await r.json();
  } catch {}
  if (!r.ok || !result.ok)
    throw httpError(result.error || 'Serviço temporariamente indisponível.', r.status);
  return result as ApiReply<T>;
}

export { api, config, sb };
