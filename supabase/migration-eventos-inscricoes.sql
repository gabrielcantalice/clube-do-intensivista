-- Roda só o que é novo: preço no evento + inscrições em evento gratuito.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.events add column if not exists external_price text default '';

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text default '',
  email text default '',
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.event_registrations enable row level security;

drop policy if exists "Aluno vê a própria inscrição, admin vê todas" on public.event_registrations;
create policy "Aluno vê a própria inscrição, admin vê todas" on public.event_registrations for select
  to authenticated using (user_id = auth.uid() or is_admin());

drop policy if exists "Aluno se inscreve por conta própria" on public.event_registrations;
create policy "Aluno se inscreve por conta própria" on public.event_registrations for insert
  to authenticated with check (user_id = auth.uid());

drop policy if exists "Aluno cancela a própria inscrição, admin remove qualquer uma" on public.event_registrations;
create policy "Aluno cancela a própria inscrição, admin remove qualquer uma" on public.event_registrations for delete
  to authenticated using (user_id = auth.uid() or is_admin());
