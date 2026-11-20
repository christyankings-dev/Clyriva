-- Clyriva Clientes v2.0. Separado da carteira administrativa.
-- Acesso explicitamente autorizado pelo administrador, por empresa e por usuario.
begin;
create or replace function clyriva_private.client_is_active(p_admin uuid,p_client text)
returns boolean language sql stable security definer set search_path='' as $fn$
 select exists (
   select 1 from public.clyriva_workspace w
   where w.admin_id=p_admin and jsonb_typeof(w.payload->'clients')='array'
   and exists(select 1 from jsonb_array_elements(w.payload->'clients') c
              where c->>'id'=p_client and c->>'status' is distinct from 'inactive')
 )
$fn$;
revoke all on function clyriva_private.client_is_active(uuid,text) from public, anon;

create or replace function clyriva_private.guard_access() returns trigger
language plpgsql security definer set search_path='' as $fn$
begin
 if new.enabled then
   perform 1 from public.clyriva_admins where user_id=new.admin_id for update;
   if not clyriva_private.client_is_active(new.admin_id,new.client_id)
      then raise exception 'Empresa inexistente ou inativa na carteira administrativa.';end if;
 end if;
 return new;
end $fn$;

-- Protege futuras rotinas que ainda usem active_client: dados sao sempre da carteira real.
create or replace function clyriva_private.active_client(p_admin uuid,p_client text) returns boolean
language sql stable security definer set search_path='' as $fn$
 select p_admin=(select auth.uid()) and clyriva_private.is_admin()
  and clyriva_private.client_is_active(p_admin,p_client)
$fn$;

create or replace function clyriva_private.client_notice_allowed(p_admin uuid,p_client text) returns boolean
language sql stable security definer set search_path='' as $fn$
 select exists (
  select 1 from public.clyriva_client_access a
  join auth.users u on u.id=a.user_id
  where a.admin_id=p_admin and a.client_id=p_client and a.user_id=(select auth.uid())
   and a.enabled and u.email_confirmed_at is not null
   and clyriva_private.client_is_active(a.admin_id,a.client_id)
 )
$fn$;
revoke all on function clyriva_private.client_notice_allowed(uuid,text) from public,anon;
grant execute on function clyriva_private.client_notice_allowed(uuid,text) to authenticated;

create table if not exists public.clyriva_client_notices (
 id uuid primary key default gen_random_uuid(),
 admin_id uuid not null references public.clyriva_admins(user_id) on delete cascade,
 client_id text not null,
 title text not null check(char_length(trim(title)) between 3 and 140),
 body text not null check(char_length(trim(body)) between 5 and 1500),
 due_date date,
 status text not null default 'active' check(status in ('active','archived')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists clyriva_notice_owner_idx on public.clyriva_client_notices(admin_id,client_id,status);
create index if not exists clyriva_notice_due_idx on public.clyriva_client_notices(due_date) where status='active';
alter table public.clyriva_client_notices enable row level security;
revoke all on public.clyriva_client_notices from public,anon,authenticated;
grant select on public.clyriva_client_notices to authenticated;
create policy notice_private_read on public.clyriva_client_notices for select to authenticated using (
 (admin_id=(select auth.uid()) and (select clyriva_private.is_admin()))
 or (status='active' and clyriva_private.client_notice_allowed(admin_id,client_id))
);

create table if not exists public.clyriva_client_push_subscriptions (
 endpoint text primary key check(endpoint like 'https://%' and char_length(endpoint) between 25 and 2048),
 user_id uuid not null references auth.users(id) on delete cascade,
 p256dh text not null check(char_length(p256dh) between 60 and 160),
 auth_secret text not null check(char_length(auth_secret) between 16 and 100),
 enabled boolean not null default true,
 last_sent_on date,
 last_test_at timestamptz,
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create index if not exists clyriva_client_push_by_user on public.clyriva_client_push_subscriptions(user_id);
alter table public.clyriva_client_push_subscriptions enable row level security;
revoke all on public.clyriva_client_push_subscriptions from public,anon,authenticated;
commit;
