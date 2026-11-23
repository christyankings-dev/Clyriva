-- Clyriva 1.5 — instalação nova ou atualização transacional da v1.4.
begin;
create schema if not exists clyriva_private;
revoke all on schema clyriva_private from public, anon;
grant usage on schema clyriva_private to authenticated;

create table if not exists public.clyriva_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.clyriva_workspace (
  admin_id uuid primary key references public.clyriva_admins(user_id) on delete cascade,
  payload jsonb not null default '{"version":1,"clients":[],"invoices":[],"cash":[],"fees":[],"tasks":[],"taxes":[]}',
  updated_at timestamptz not null default now()
);
create table if not exists public.clyriva_vault (
  admin_id uuid primary key references public.clyriva_admins(user_id) on delete cascade,
  encrypted jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.clyriva_client_access (
  admin_id uuid not null references public.clyriva_admins(user_id) on delete cascade,
  client_id text not null,
  email text not null check (email = lower(trim(email)) and position('@' in email) > 1),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (admin_id, client_id, email)
);
create index if not exists clyriva_access_email_idx on public.clyriva_client_access (email);
create table if not exists public.clyriva_client_views (
  admin_id uuid not null references public.clyriva_admins(user_id) on delete cascade,
  client_id text not null,
  info jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default now(),
  primary key (admin_id, client_id)
);

-- Somente admins podem conferir se sao administradores; nao podem criar a propria funcao.
alter table public.clyriva_admins enable row level security;
alter table public.clyriva_workspace enable row level security;
alter table public.clyriva_vault enable row level security;
alter table public.clyriva_client_access enable row level security;
alter table public.clyriva_client_views enable row level security;

revoke all on public.clyriva_admins, public.clyriva_workspace,
  public.clyriva_vault, public.clyriva_client_access, public.clyriva_client_views
  from public, anon, authenticated;
grant select on public.clyriva_admins to authenticated;
grant select on public.clyriva_workspace to authenticated;
grant select on public.clyriva_vault to authenticated;
grant select, insert, update, delete on public.clyriva_client_access to authenticated;
grant select on public.clyriva_client_views to authenticated;

create or replace function clyriva_private.is_confirmed_invitee(p_admin uuid, p_client text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.clyriva_client_access a
    join auth.users u on u.id = (select auth.uid())
    where a.admin_id = p_admin
      and a.client_id = p_client
      and a.enabled = true
      and a.email = lower(u.email)
      and u.email_confirmed_at is not null
  );
$$;
revoke all on function clyriva_private.is_confirmed_invitee(uuid,text) from public, anon;
grant execute on function clyriva_private.is_confirmed_invitee(uuid,text) to authenticated;

drop policy if exists "admin_read_self" on public.clyriva_admins;
create policy "admin_read_self" on public.clyriva_admins for select to authenticated
 using (user_id = (select auth.uid()));

drop policy if exists "workspace_admin_read" on public.clyriva_workspace;
create policy "workspace_admin_read" on public.clyriva_workspace for select to authenticated
 using (admin_id = (select auth.uid()));
drop policy if exists "workspace_admin_insert" on public.clyriva_workspace;
create policy "workspace_admin_insert" on public.clyriva_workspace for insert to authenticated
 with check (admin_id = (select auth.uid()));
drop policy if exists "workspace_admin_update" on public.clyriva_workspace;
create policy "workspace_admin_update" on public.clyriva_workspace for update to authenticated
 using (admin_id = (select auth.uid())) with check (admin_id = (select auth.uid()));

drop policy if exists "vault_admin_read" on public.clyriva_vault;
create policy "vault_admin_read" on public.clyriva_vault for select to authenticated
 using (admin_id = (select auth.uid()));
drop policy if exists "vault_admin_insert" on public.clyriva_vault;
create policy "vault_admin_insert" on public.clyriva_vault for insert to authenticated
 with check (admin_id = (select auth.uid()));
drop policy if exists "vault_admin_update" on public.clyriva_vault;
create policy "vault_admin_update" on public.clyriva_vault for update to authenticated
 using (admin_id = (select auth.uid())) with check (admin_id = (select auth.uid()));
drop policy if exists "vault_admin_delete" on public.clyriva_vault;
create policy "vault_admin_delete" on public.clyriva_vault for delete to authenticated
 using (admin_id = (select auth.uid()));

drop policy if exists "access_admin_read" on public.clyriva_client_access;
create policy "access_admin_read" on public.clyriva_client_access for select to authenticated
 using (admin_id = (select auth.uid()));
drop policy if exists "access_admin_insert" on public.clyriva_client_access;
create policy "access_admin_insert" on public.clyriva_client_access for insert to authenticated
 with check (admin_id = (select auth.uid()));
drop policy if exists "access_admin_update" on public.clyriva_client_access;
create policy "access_admin_update" on public.clyriva_client_access for update to authenticated
 using (admin_id = (select auth.uid())) with check (admin_id = (select auth.uid()));
drop policy if exists "access_admin_delete" on public.clyriva_client_access;
create policy "access_admin_delete" on public.clyriva_client_access for delete to authenticated
 using (admin_id = (select auth.uid()));

drop policy if exists "view_admin_or_invited_read" on public.clyriva_client_views;
create policy "view_admin_or_invited_read" on public.clyriva_client_views for select to authenticated
 using (admin_id = (select auth.uid()) or clyriva_private.is_confirmed_invitee(admin_id, client_id));
drop policy if exists "view_admin_insert" on public.clyriva_client_views;
create policy "view_admin_insert" on public.clyriva_client_views for insert to authenticated
 with check (admin_id = (select auth.uid()));
drop policy if exists "view_admin_update" on public.clyriva_client_views;
create policy "view_admin_update" on public.clyriva_client_views for update to authenticated
 using (admin_id = (select auth.uid())) with check (admin_id = (select auth.uid()));
drop policy if exists "view_admin_delete" on public.clyriva_client_views;
create policy "view_admin_delete" on public.clyriva_client_views for delete to authenticated
 using (admin_id = (select auth.uid()));


alter table public.clyriva_workspace add column if not exists revision bigint not null default 0;

-- Além da FK para administradores, exige identidade confirmada em cada operação de escrita.
create or replace function clyriva_private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.clyriva_admins a join auth.users u on u.id=a.user_id
    where a.user_id=(select auth.uid()) and u.email_confirmed_at is not null)
$$;
revoke all on function clyriva_private.is_admin() from public,anon;
grant execute on function clyriva_private.is_admin() to authenticated;

create or replace function clyriva_private.active_client(p_admin uuid,p_client text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_admin=(select auth.uid()) and clyriva_private.is_admin() and exists(
    select 1 from public.clyriva_client_views v where v.admin_id=p_admin and v.client_id=p_client)
$$;
revoke all on function clyriva_private.active_client(uuid,text) from public,anon;
grant execute on function clyriva_private.active_client(uuid,text) to authenticated;
alter policy "access_admin_insert" on public.clyriva_client_access
  with check (clyriva_private.active_client(admin_id,client_id));
alter policy "access_admin_update" on public.clyriva_client_access
  using(admin_id=(select auth.uid()) and (select clyriva_private.is_admin()))
  with check(admin_id=(select auth.uid()) and (not enabled or clyriva_private.active_client(admin_id,client_id)));
alter policy "workspace_admin_read" on public.clyriva_workspace
  using(admin_id=(select auth.uid()) and (select clyriva_private.is_admin()));
alter policy "vault_admin_read" on public.clyriva_vault
  using(admin_id=(select auth.uid()) and (select clyriva_private.is_admin()));
alter policy "access_admin_read" on public.clyriva_client_access
  using(admin_id=(select auth.uid()) and (select clyriva_private.is_admin()));
alter policy "access_admin_delete" on public.clyriva_client_access
  using(admin_id=(select auth.uid()) and (select clyriva_private.is_admin()));
alter policy "view_admin_or_invited_read" on public.clyriva_client_views
  using((admin_id=(select auth.uid()) and (select clyriva_private.is_admin()))
        or clyriva_private.is_confirmed_invitee(admin_id,client_id));

-- Serializa a concessão com a remoção ou troca de identidade da empresa.
create or replace function clyriva_private.guard_access() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.enabled then
    perform 1 from public.clyriva_admins where user_id=new.admin_id for update;
    if not exists(select 1 from public.clyriva_client_views v where v.admin_id=new.admin_id and v.client_id=new.client_id)
      then raise exception 'Empresa inativa ou removida.';end if;
  end if;
  return new;
end $$;
revoke all on function clyriva_private.guard_access() from public,anon,authenticated;
drop trigger if exists clyriva_guard_access on public.clyriva_client_access;
create trigger clyriva_guard_access before insert or update on public.clyriva_client_access
for each row execute function clyriva_private.guard_access();

-- Projeção por lista explícita. Campos adicionados à carteira permanecem privados por padrão.
create or replace function clyriva_private.pick(obj jsonb, keys text[]) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(key,value),'{}') from jsonb_each(obj)
  where key=any(keys) and jsonb_typeof(value) in ('string','number','boolean','null')
$$;
revoke all on function clyriva_private.pick(jsonb,text[]) from public,anon,authenticated;

create or replace function clyriva_private.publish(a uuid,d jsonb) returns void
language plpgsql set search_path = '' as $$
begin
  delete from public.clyriva_client_views v where v.admin_id=a and not exists(
    select 1 from jsonb_array_elements(d->'clients') c where c->>'id'=v.client_id and c->>'status' is distinct from 'inactive');
  delete from public.clyriva_client_access g where g.admin_id=a and not exists(
    select 1 from jsonb_array_elements(d->'clients') c where c->>'id'=g.client_id);
  update public.clyriva_client_access g set enabled=false where g.admin_id=a and g.enabled and exists(
    select 1 from jsonb_array_elements(d->'clients') c where c->>'id'=g.client_id and c->>'status'='inactive');
  with payments as (
    select j->>'clientId' cid,j->>'invoiceId' iid,sum(nullif(j->>'value','')::numeric) paid
    from jsonb_array_elements(d->'cash') j where j->>'kind'='receipt' and coalesce(j->>'invoiceId','')<>''
    group by 1,2
  ), invoices as (
    select j->>'clientId' cid,jsonb_agg(clyriva_private.pick(j,array['id','number','date','competence','value','status','description'])
      || jsonb_build_object('paid',coalesce(p.paid,0)) order by idx) items
    from jsonb_array_elements(d->'invoices') with ordinality inv(j,idx)
    left join payments p on p.cid=j->>'clientId' and p.iid=j->>'id'
    where j->>'status' in ('issued','canceled') group by 1
  ), taxes as (
    select j->>'clientId' cid,jsonb_agg(clyriva_private.pick(j,array['id','kind','competence','value','status','dueDate','paidAt']) order by idx) items
    from jsonb_array_elements(d->'taxes') with ordinality tax(j,idx) group by 1
  ), tasks as (
    select j->>'clientId' cid,jsonb_agg(clyriva_private.pick(j,array['id','title','category','competence','dueDate','status']) order by idx) items
    from jsonb_array_elements(d->'tasks') with ordinality task(j,idx) group by 1
  )
  insert into public.clyriva_client_views(admin_id,client_id,info,published_at)
  select a,c->>'id',jsonb_build_object('client',clyriva_private.pick(c,array[
    'name','tradeName','document','regime','segment','status','activityCode','registryStatus','legalNature',
    'companySize','openingDate','address','city','uf','zipCode','email','phone','contactName']),
    'invoices',coalesce(i.items,'[]'),'taxes',coalesce(t.items,'[]'),'tasks',coalesce(k.items,'[]'),'publishedAt',now()),now()
  from jsonb_array_elements(d->'clients') c
  left join invoices i on i.cid=c->>'id' left join taxes t on t.cid=c->>'id' left join tasks k on k.cid=c->>'id'
  where c->>'status' is distinct from 'inactive'
  on conflict(admin_id,client_id) do update set info=excluded.info,published_at=excluded.published_at
    where (clyriva_client_views.info-'publishedAt') is distinct from (excluded.info-'publishedAt');
end $$;
revoke all on function clyriva_private.publish(uuid,jsonb) from public,anon,authenticated;

create or replace function public.clyriva_load()
returns jsonb language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object('data',w.payload,'revision',coalesce(w.revision,0),'vault',v.encrypted)
 from public.clyriva_admins a left join public.clyriva_workspace w on w.admin_id=a.user_id
 left join public.clyriva_vault v on v.admin_id=a.user_id
 where a.user_id=(select auth.uid()) and clyriva_private.is_admin()
$$;
revoke all on function public.clyriva_load() from public,anon;
grant execute on function public.clyriva_load() to authenticated;

create or replace function clyriva_private.validate_ledger(d jsonb) returns void
language plpgsql set search_path='' as $$
declare k text; bad text;
begin
  foreach k in array array['cash','fees','tasks','taxes','invoices'] loop
    select j->>'id' into bad from jsonb_array_elements(d->k) j
    where not exists(select 1 from jsonb_array_elements(d->'clients') c where c->>'id'=j->>'clientId') limit 1;
    if found then raise exception 'Cliente inexistente em % (%)',k,bad;end if;
  end loop;
  foreach k in array array['clients','cash','fees','taxes','invoices'] loop
    if exists(select 1 from jsonb_array_elements(d->k) j cross join lateral jsonb_each(j) e
      where e.key=any(case k when 'clients' then array['monthlyFee'] when 'fees' then array['paid','expected'] else array['value'] end)
      and jsonb_typeof(e.value)<>'null' and (e.value #>> '{}') !~ '^[0-9]+([.][0-9]+)?$') then
      raise exception 'Valor monetário inválido em %',k;
    end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(d->'fees') j group by j->>'clientId',j->>'competence' having count(*)>1)
    then raise exception 'Honorários duplicados por competência'; end if;
  if exists(select 1 from jsonb_array_elements(d->'fees') j where coalesce((j->>'paid')::numeric,0)>coalesce((j->>'expected')::numeric,0))
    then raise exception 'Honorários recebidos superam o valor devido'; end if;
  if exists(select 1 from jsonb_array_elements(d->'cash') r
    left join jsonb_array_elements(d->'invoices') i on i->>'id'=r->>'invoiceId' and i->>'clientId'=r->>'clientId'
    where coalesce(r->>'invoiceId','')<>'' and (i is null or i->>'status' is distinct from 'issued' or r->>'kind' is distinct from 'receipt'))
    then raise exception 'Vínculo de nota e recebimento incompatível. Confira cliente e situação da NF.';end if;
  if exists(select 1 from jsonb_array_elements(d->'cash') r join jsonb_array_elements(d->'invoices') i on i->>'id'=r->>'invoiceId'
    group by i->>'id',i->>'value' having sum((r->>'value')::numeric)>(i->>'value')::numeric)
    then raise exception 'Recebimentos superiores ao valor da nota';end if;
end $$;
revoke all on function clyriva_private.validate_ledger(jsonb) from public,anon,authenticated;

create or replace function public.clyriva_commit(p_expected bigint,p_workspace jsonb,p_vault jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare a uuid := (select auth.uid()); actual bigint; old_workspace jsonb; k text;
begin
  if not clyriva_private.is_admin() then raise exception 'Acesso administrativo necessário' using errcode='42501';end if;
  -- Linha estável inclusive na primeira gravação. Duas abas nunca substituem a mesma revisão.
  perform 1 from public.clyriva_admins where user_id=a for update;
  select revision,payload into actual,old_workspace from public.clyriva_workspace where admin_id=a;
  actual:=coalesce(actual,0);
  if p_expected is distinct from actual then raise exception 'A carteira mudou em outra aba. Recarregue antes de salvar.' using errcode='40001';end if;
  if jsonb_typeof(p_workspace) is distinct from 'object' or p_workspace->>'version' is distinct from '1'
     or p_workspace ? 'cofreCriptografado' then raise exception 'Carteira inválida';end if;
  foreach k in array array['clients','cash','fees','tasks','taxes','invoices'] loop
    if jsonb_typeof(p_workspace->k) is distinct from 'array' then raise exception 'Lista inválida: %',k;end if;
    if exists(select 1 from jsonb_array_elements(p_workspace->k) j group by j->>'id' having nullif(trim(j->>'id'),'') is null or count(*)>1)
       then raise exception 'Identificador inválido em %', k;end if;
  end loop;
  if p_vault is not null and (jsonb_typeof(p_vault) is distinct from 'object'
    or (p_vault-array['version','iterations','salt','iv','cipher','alg','kdf'])<>'{}'::jsonb
    or jsonb_typeof(p_vault->'iterations') is distinct from 'number'
    or (p_vault ? 'alg' and p_vault->>'alg' is distinct from 'AES-GCM')
    or (p_vault ? 'kdf' and p_vault->>'kdf' is distinct from 'PBKDF2-SHA256')
    or not (p_vault ?& array['version','iterations','salt','iv','cipher'])
    or p_vault->>'version' is distinct from '1' or (p_vault->>'iterations')::int not between 100000 and 2000000
    or length(decode(p_vault->>'salt','base64')) is distinct from 16 or length(decode(p_vault->>'iv','base64')) is distinct from 12
    or coalesce(length(decode(p_vault->>'cipher','base64')),0)<16) then raise exception 'Cofre inválido';end if;
  if old_workspace is distinct from p_workspace then perform clyriva_private.validate_ledger(p_workspace);end if;
  if old_workspace is not null and old_workspace->'clients' is distinct from p_workspace->'clients' then
    update public.clyriva_client_access g set enabled=false
    from jsonb_array_elements(old_workspace->'clients') prev
    join jsonb_array_elements(p_workspace->'clients') nxt on nxt->>'id'=prev->>'id'
    where g.admin_id=a and g.enabled and g.client_id=prev->>'id' and (
      regexp_replace(upper(coalesce(prev->>'document','')),'[^A-Z0-9]','','g') <>
        regexp_replace(upper(coalesce(nxt->>'document','')),'[^A-Z0-9]','','g')
      or (coalesce(prev->>'document','')='' and coalesce(nxt->>'document','')='' and
          lower(trim(prev->>'name')) is distinct from lower(trim(nxt->>'name')))
    );
  end if;
  actual:=actual+1;
  insert into public.clyriva_workspace(admin_id,payload,revision,updated_at) values(a,p_workspace,actual,now())
    on conflict(admin_id) do update set payload=excluded.payload,revision=excluded.revision,updated_at=now();
  if p_vault is null then delete from public.clyriva_vault where admin_id=a;
  else insert into public.clyriva_vault(admin_id,encrypted) values(a,p_vault) on conflict(admin_id)
    do update set encrypted=excluded.encrypted,updated_at=now() where clyriva_vault.encrypted is distinct from excluded.encrypted;
  end if;
  if old_workspace is distinct from p_workspace then perform clyriva_private.publish(a,p_workspace);end if;
  return actual;
end $$;
revoke all on function public.clyriva_commit(bigint,jsonb,jsonb) from public,anon;
grant execute on function public.clyriva_commit(bigint,jsonb,jsonb) to authenticated;

create or replace function public.clyriva_republish(p_expected bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare a uuid := (select auth.uid()); w public.clyriva_workspace;
begin
  if not clyriva_private.is_admin() then raise exception 'Acesso administrativo necessário' using errcode='42501';end if;
  perform 1 from public.clyriva_admins where user_id=a for update;
  select * into w from public.clyriva_workspace where admin_id=a;
  if p_expected is distinct from coalesce(w.revision,0) then raise exception 'A carteira mudou. Recarregue antes de publicar.' using errcode='40001';end if;
  if w.payload is not null then perform clyriva_private.publish(a,w.payload);end if;
end $$;
revoke all on function public.clyriva_republish(bigint) from public,anon;
grant execute on function public.clyriva_republish(bigint) to authenticated;

-- Recalcula publicações legadas na mesma transação; convite sem carteira nunca publica dados.
do $$ declare w record; begin
  delete from public.clyriva_client_views v where not exists(select 1 from public.clyriva_workspace w0 where w0.admin_id=v.admin_id);
  delete from public.clyriva_client_access g where not exists(select 1 from public.clyriva_workspace w0 where w0.admin_id=g.admin_id);
  for w in select admin_id,payload from public.clyriva_workspace loop
    perform clyriva_private.publish(w.admin_id,w.payload);
  end loop;
end $$;
commit;
