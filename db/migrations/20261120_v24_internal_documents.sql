-- Arquivos privados de obrigações e guias cadastradas na carteira administrativa.
-- A tabela é inacessível pelo REST para clientes; autorização passa por Edge Function.
begin;
create table if not exists public.clyriva_internal_attachments (
 id uuid primary key default gen_random_uuid(),
 admin_id uuid not null references public.clyriva_admins(user_id) on delete cascade,
 client_id text not null,
 entity_type text not null check(entity_type in ('task','tax')),
 entity_id text not null check(length(entity_id) between 6 and 120),
 storage_path text not null unique,
 original_name text not null check(length(original_name) between 1 and 120),
 mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png')),
 size_bytes integer not null check(size_bytes between 1 and 5242880),
 state text not null default 'pending' check(state in ('pending','ready')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists clyriva_internal_docs_owner_idx on public.clyriva_internal_attachments(admin_id,entity_type,entity_id,state);
alter table public.clyriva_internal_attachments enable row level security;
revoke all on public.clyriva_internal_attachments from public,anon,authenticated;
commit;
