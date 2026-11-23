import { httpError } from '../../shared/lib/errors.ts';

const cfg = window.CLYRIVA_CONFIG || {};

const client = window.supabase.createClient(cfg.supabaseUrl ?? '', cfg.supabaseAnonKey ?? '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

const base = cfg.supabaseUrl + '/functions/v1/clyriva-client';

async function api<T extends object = object>(
  action: string,
  data: object = {},
): Promise<T & { ok: true }> {
  const {
    data: { session },
    error,
  } = await client.auth.getSession();
  if (error || !session?.access_token)
    throw Error('Entre pelo painel administrativo antes de continuar.');
  const res = await fetch(base + '/admin-' + action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: cfg.supabaseAnonKey ?? '',
      Authorization: 'Bearer ' + session.access_token,
    },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  let value: { ok?: boolean; error?: string } = {};
  try {
    value = await res.json();
  } catch {}
  if (!res.ok || !value.ok) throw httpError(value.error || 'Falha na operação.', res.status);
  return value as T & { ok: true };
}

export { api, client };
