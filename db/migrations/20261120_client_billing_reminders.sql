-- Clyriva v2.1: cobrancas por empresa, avisos diarios D-3 / D-2 / D-1 / D0 e deduplicacao por celular.
begin;
alter table public.clyriva_client_notices
 add column if not exists notice_type text not null default 'Aviso',
 add column if not exists amount_cents bigint,
 add column if not exists reminder_enabled boolean not null default false,
 add column if not exists paid_at timestamptz;
alter table public.clyriva_client_notices drop constraint if exists clyriva_client_notices_status_check;
alter table public.clyriva_client_notices add constraint clyriva_client_notices_status_check
 check(status in ('active','archived','paid'));
alter table public.clyriva_client_notices add constraint clyriva_notice_type_check
 check(notice_type in ('Aviso','DAS','Boleto','DARF','FGTS','INSS','Guia','Outro'));
alter table public.clyriva_client_notices add constraint clyriva_notice_amount_check
 check(amount_cents is null or (amount_cents>=1 and amount_cents<=99999999999));
alter table public.clyriva_client_notices add constraint clyriva_notice_reminder_check
 check(not reminder_enabled or (due_date is not null and amount_cents is not null and notice_type<>'Aviso'));
alter table public.clyriva_client_push_subscriptions
 add column if not exists show_amount boolean not null default false;
create table if not exists public.clyriva_client_push_deliveries(
 endpoint text not null references public.clyriva_client_push_subscriptions(endpoint) on delete cascade,
 notice_id uuid not null references public.clyriva_client_notices(id) on delete cascade,
 delivery_date date not null,
 days_before smallint not null check(days_before between 0 and 3),
 state text not null default 'pending' check(state in ('pending','sent')),
 attempted_at timestamptz not null default now(),
 sent_at timestamptz,
 primary key(endpoint,notice_id,delivery_date)
);
create index if not exists clyriva_delivery_notice_idx on public.clyriva_client_push_deliveries(notice_id,delivery_date);
alter table public.clyriva_client_push_deliveries enable row level security;
revoke all on public.clyriva_client_push_deliveries from public,anon,authenticated;
drop policy if exists notice_private_read on public.clyriva_client_notices;
create policy notice_private_read on public.clyriva_client_notices for select to authenticated using(
  (admin_id=(select auth.uid()) and (select clyriva_private.is_admin()))
  or (status in ('active','paid') and clyriva_private.client_notice_allowed(admin_id,client_id))
);
commit;
