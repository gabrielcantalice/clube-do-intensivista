-- Clube do Intensivista — schema inicial do Supabase
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase (Supabase Dashboard > SQL Editor > New query).
-- Ele cria as tabelas, ativa Row Level Security (RLS) e define quem pode ler/escrever cada uma.

-- =========================================================
-- 1. PERFIS (estende a tabela de usuários do Supabase Auth)
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text default '',
  profession text default '',
  role text not null default 'aluno' check (role in ('aluno', 'admin')),
  created_at timestamptz not null default now()
);

-- "create table if not exists" não adiciona coluna em tabela que já existia
-- antes dela existir no schema — por isso as colunas adicionadas depois da
-- criação inicial da tabela também precisam de "add column if not exists".
alter table public.profiles add column if not exists email text default '';

alter table public.profiles enable row level security;

drop policy if exists "Qualquer pessoa logada vê os perfis (para o ranking)" on public.profiles;
create policy "Qualquer pessoa logada vê os perfis (para o ranking)"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Cada pessoa edita só o próprio perfil" on public.profiles;
create policy "Cada pessoa edita só o próprio perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Cada pessoa cria só o próprio perfil" on public.profiles;
create policy "Cada pessoa cria só o próprio perfil"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Cria o perfil automaticamente quando alguém se cadastra. "on conflict do
-- nothing" evita que o cadastro quebre se, por algum motivo, já existir uma
-- linha de perfil com esse id (ex: tentativa anterior que falhou no meio).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, profession)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email, coalesce(new.raw_user_meta_data->>'profession', ''))
  on conflict (id) do nothing;
  return new;
exception when others then
  raise warning 'handle_new_user falhou pra %: %', new.id, sqlerrm;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Função auxiliar: "esta pessoa logada é admin?" (usada nas policies abaixo)
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- Pontuação de engajamento (ranking): pergunta/resposta na Central de Dúvidas
-- e acerto no teste clínico (Na Prática). Só o próprio usuário logado pontua
-- pra si mesmo — a função roda como "security definer" pra não precisar de
-- uma policy de update liberada, o que evitaria alguém alterar XP de outro.
alter table public.profiles add column if not exists engagement_points integer not null default 0;
alter table public.profiles add column if not exists case_streak integer not null default 0;
alter table public.profiles add column if not exists case_best_streak integer not null default 0;

create or replace function public.add_engagement_points(amount int)
returns void as $$
begin
  update public.profiles set engagement_points = engagement_points + amount where id = auth.uid();
end;
$$ language plpgsql security definer;

grant execute on function public.add_engagement_points(int) to authenticated;

-- Registra uma resposta do teste clínico (Na Prática): acerto soma XP e
-- avança a sequência; erro zera a sequência atual (o recorde fica salvo).
create or replace function public.record_case_answer(is_correct boolean)
returns void as $$
begin
  if is_correct then
    update public.profiles
      set case_streak = case_streak + 1,
          case_best_streak = greatest(case_best_streak, case_streak + 1),
          engagement_points = engagement_points + 5
      where id = auth.uid();
  else
    update public.profiles set case_streak = 0 where id = auth.uid();
  end if;
end;
$$ language plpgsql security definer;

grant execute on function public.record_case_answer(boolean) to authenticated;

-- =========================================================
-- 2. CURSOS E AULAS
-- =========================================================
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  modality text not null default 'Presencial',
  workload text default '',
  description text default '',
  external_price text default '',        -- ex: "R$ 497" (preenchido quando vendido fora do site)
  external_link text default '',         -- link de checkout (Hotmart, etc.) — vazio = curso gratuito interno
  hotmart_product_id text default '',    -- ID do produto na Hotmart, usado para casar com o webhook
  hotmart_watch_url text default '',     -- se preenchido, o aluno assiste as aulas na Hotmart (não no site)
  image_url text default '',             -- foto de capa do curso
  created_at timestamptz not null default now()
);

-- Garante essas colunas mesmo se "courses" já existia antes delas serem
-- adicionadas aqui (mesmo motivo do "email" em profiles, ver acima).
alter table public.courses add column if not exists external_price text default '';
alter table public.courses add column if not exists external_link text default '';
alter table public.courses add column if not exists hotmart_product_id text default '';
alter table public.courses add column if not exists hotmart_watch_url text default '';
alter table public.courses add column if not exists image_url text default '';

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  duration text default '',
  video_url text default '',             -- link do player (Panda Video, Bunny, YouTube não listado etc.)
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.courses enable row level security;
alter table public.lessons enable row level security;

drop policy if exists "Todo mundo vê os cursos" on public.courses;
create policy "Todo mundo vê os cursos" on public.courses for select using (true);
drop policy if exists "Só admin cadastra curso" on public.courses;
create policy "Só admin cadastra curso" on public.courses for insert to authenticated with check (is_admin());
drop policy if exists "Só admin edita curso" on public.courses;
create policy "Só admin edita curso" on public.courses for update to authenticated using (is_admin());
drop policy if exists "Só admin remove curso" on public.courses;
create policy "Só admin remove curso" on public.courses for delete to authenticated using (is_admin());

drop policy if exists "Todo mundo vê as aulas" on public.lessons;
create policy "Todo mundo vê as aulas" on public.lessons for select using (true);
drop policy if exists "Só admin cadastra aula" on public.lessons;
create policy "Só admin cadastra aula" on public.lessons for insert to authenticated with check (is_admin());
drop policy if exists "Só admin edita aula" on public.lessons;
create policy "Só admin edita aula" on public.lessons for update to authenticated using (is_admin());
drop policy if exists "Só admin remove aula" on public.lessons;
create policy "Só admin remove aula" on public.lessons for delete to authenticated using (is_admin());

-- =========================================================
-- 3. MATRÍCULAS (liberadas manualmente pelo admin OU pelo webhook da Hotmart)
-- =========================================================
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  email text not null,                   -- guardado também aqui pois o webhook chega antes de existir conta
  status text not null default 'active' check (status in ('active', 'revoked')),
  source text not null default 'manual' check (source in ('manual', 'hotmart', 'free')),
  hotmart_transaction text default '',
  created_at timestamptz not null default now(),
  unique (email, course_id)
);

alter table public.enrollments enable row level security;

drop policy if exists "Aluno vê as próprias matrículas" on public.enrollments;
create policy "Aluno vê as próprias matrículas" on public.enrollments for select
  to authenticated using (user_id = auth.uid() or is_admin());
drop policy if exists "Só admin ou o backend cria/edita matrícula" on public.enrollments;
create policy "Só admin ou o backend cria/edita matrícula" on public.enrollments for insert
  to authenticated with check (is_admin());
drop policy if exists "Só admin edita matrícula" on public.enrollments;
create policy "Só admin edita matrícula" on public.enrollments for update
  to authenticated using (is_admin());

-- =========================================================
-- 4. PROGRESSO DO ALUNO (aulas assistidas)
-- =========================================================
create table if not exists public.lesson_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.lesson_progress enable row level security;

drop policy if exists "Cada um vê e marca só o próprio progresso" on public.lesson_progress;
create policy "Cada um vê e marca só o próprio progresso" on public.lesson_progress
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================================================
-- 5. MATERIAIS
-- =========================================================
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'E-book',
  description text default '',
  file_url text default '',          -- arquivo enviado (Supabase Storage)
  external_link text default '',     -- ou link externo (Google Drive, Hotmart etc.)
  free boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.materials add column if not exists description text default '';
alter table public.materials add column if not exists external_link text default '';

alter table public.materials enable row level security;
drop policy if exists "Todo mundo vê os materiais" on public.materials;
create policy "Todo mundo vê os materiais" on public.materials for select using (true);
drop policy if exists "Só admin gerencia materiais" on public.materials;
create policy "Só admin gerencia materiais" on public.materials for all
  to authenticated using (is_admin()) with check (is_admin());

-- =========================================================
-- 6. EVENTOS / AGENDA
-- =========================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  type text not null default 'Curso presencial',
  external_price text default '',        -- ex: "R$ 197" (preenchido quando o evento é pago)
  external_link text default '',         -- link de pagamento/inscrição — vazio = evento gratuito, inscrição pelo site
  image_url text default '',             -- foto do evento
  created_at timestamptz not null default now()
);
alter table public.events add column if not exists external_price text default '';
alter table public.events add column if not exists image_url text default '';

alter table public.events enable row level security;
drop policy if exists "Todo mundo vê os eventos" on public.events;
create policy "Todo mundo vê os eventos" on public.events for select using (true);
drop policy if exists "Só admin gerencia eventos" on public.events;
create policy "Só admin gerencia eventos" on public.events for all
  to authenticated using (is_admin()) with check (is_admin());

-- Inscrições de alunos em eventos gratuitos organizados pelo próprio site
-- (eventos pagos usam o link de pagamento externo em vez disso)
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

-- =========================================================
-- 7. COMUNICADOS
-- =========================================================
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;
drop policy if exists "Todo mundo vê os comunicados" on public.announcements;
create policy "Todo mundo vê os comunicados" on public.announcements for select using (true);
drop policy if exists "Só admin publica comunicado" on public.announcements;
create policy "Só admin publica comunicado" on public.announcements for all
  to authenticated using (is_admin()) with check (is_admin());

-- =========================================================
-- 8. CENTRAL DE DÚVIDAS (fórum)
-- =========================================================
create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  tag text default 'Outro',
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.forum_answers (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.forum_threads enable row level security;
alter table public.forum_answers enable row level security;

drop policy if exists "Todo mundo vê as dúvidas" on public.forum_threads;
create policy "Todo mundo vê as dúvidas" on public.forum_threads for select using (true);
drop policy if exists "Aluno logado publica dúvida" on public.forum_threads;
create policy "Aluno logado publica dúvida" on public.forum_threads for insert
  to authenticated with check (author_id = auth.uid());

drop policy if exists "Todo mundo vê as respostas" on public.forum_answers;
create policy "Todo mundo vê as respostas" on public.forum_answers for select using (true);
drop policy if exists "Aluno logado responde dúvida" on public.forum_answers;
create policy "Aluno logado responde dúvida" on public.forum_answers for insert
  to authenticated with check (author_id = auth.uid());

-- Quem perguntou marca se a resposta resolveu ou não; respostas úteis contam
-- pro selo de "Especialista do Clube" e dão pontos extra pra quem respondeu.
alter table public.forum_answers add column if not exists helpful boolean;
alter table public.profiles add column if not exists helpful_answers_count integer not null default 0;

create or replace function public.mark_answer_helpful(p_answer_id uuid, p_is_helpful boolean)
returns void as $$
declare
  ans record;
begin
  select fa.id, fa.author_id, fa.helpful, ft.author_id as thread_author_id
    into ans
    from public.forum_answers fa
    join public.forum_threads ft on ft.id = fa.thread_id
    where fa.id = p_answer_id;

  if not found then
    return;
  end if;

  if ans.thread_author_id is distinct from auth.uid() then
    raise exception 'Só quem fez a pergunta pode avaliar a resposta.';
  end if;

  if ans.helpful is distinct from p_is_helpful then
    update public.forum_answers set helpful = p_is_helpful where id = p_answer_id;

    if p_is_helpful = true then
      update public.profiles set helpful_answers_count = helpful_answers_count + 1, engagement_points = engagement_points + 10 where id = ans.author_id;
    elsif ans.helpful = true then
      update public.profiles set helpful_answers_count = greatest(helpful_answers_count - 1, 0) where id = ans.author_id;
    end if;
  end if;
end;
$$ language plpgsql security definer;

grant execute on function public.mark_answer_helpful(uuid, boolean) to authenticated;

-- =========================================================
-- 9. HABILITAR REALTIME (para a Central de Dúvidas atualizar sozinha na tela)
-- =========================================================
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'forum_threads') then
    alter publication supabase_realtime add table public.forum_threads;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'forum_answers') then
    alter publication supabase_realtime add table public.forum_answers;
  end if;
end $$;

-- =========================================================
-- 10. ARMAZENAMENTO DE FOTOS (capa de cursos e eventos)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "Qualquer pessoa vê as fotos" on storage.objects;
create policy "Qualquer pessoa vê as fotos"
  on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "Só admin envia fotos" on storage.objects;
create policy "Só admin envia fotos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and is_admin());

drop policy if exists "Só admin remove fotos" on storage.objects;
create policy "Só admin remove fotos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and is_admin());

-- =========================================================
-- Pronto. Depois de rodar este script:
-- 1. Vá em Authentication > Providers e confirme que "Email" está habilitado.
-- 2. Crie seu primeiro usuário admin: cadastre-se normalmente pelo site (ou pelo
--    Authentication > Users > Add user aqui no painel) e depois rode:
--    update public.profiles set role = 'admin' where id = 'SEU-UUID-AQUI';
-- =========================================================
