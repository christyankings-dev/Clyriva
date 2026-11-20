-- Clyriva v2.3 · Guias e boletos privados vinculados aos avisos.
-- Nunca entregar links públicos nem permitir SELECT em storage.objects pelo navegador.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('clyriva-client-attachments','clyriva-client-attachments',false,5242880,array['application/pdf','image/jpeg','image/png']::text[])
on conflict (id) do update set
 public=false,
 file_size_limit=5242880,
 allowed_mime_types=array['application/pdf','image/jpeg','image/png']::text[];

create table if not exists public.clyriva_notice_attachments (
 id uuid primary key default gen_random_uuid(),
 notice_id uuid not null references public.clyriva_client_notices(id) on delete cascade,
 admin_id uuid not null references public.clyriva_admins(user_id) on delete cascade,
 client_id text not null,
 storage_path text not null unique,
 original_name text not null check (char_length(original_name) between 1 and 120),
 mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png')),
 size_bytes integer not null check (size_bytes between 1 and 5242880),
 state text not null default 'pending' check (state in ('pending','ready')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint clyriva_attachment_path check (char_length(storage_path) between 50 and 240)
);
create index if not exists clyriva_attachments_per_notice on public.clyriva_notice_attachments(notice_id,state,created_at);
create index if not exists clyriva_attachments_admin on public.clyriva_notice_attachments(admin_id,client_id);
alter table public.clyriva_notice_attachments enable row level security;
revoke all on public.clyriva_notice_attachments from public,anon,authenticated;
-- Serviço Edge com service role aplica a autorização por empresa antes de criar links assinados.
commit;
