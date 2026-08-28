-- Clube do Intensivista — schema inicial do Supabase
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase (Supabase Dashboard > SQL Editor > New query).
-- Ele cria as tabelas, ativa Row Level Security (RLS) e define quem pode ler/escrever cada uma.

-- =========================================================
-- 1. PERFIS (estende a tabela de usuários do Supabase Auth)
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  profession text default '',
  role text not null default 'aluno' check (role in ('aluno', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Qualquer pessoa logada vê os perfis (para o ranking)"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Cada pessoa edita só o próprio perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Cada pessoa cria só o próprio perfil"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Cria o perfil automaticamente quando alguém se cadastra
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

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
  created_at timestamptz not null default now()
);

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

create policy "Todo mundo vê os cursos" on public.courses for select using (true);
create policy "Só admin cadastra curso" on public.courses for insert to authenticated with check (is_admin());
create policy "Só admin edita curso" on public.courses for update to authenticated using (is_admin());
create policy "Só admin remove curso" on public.courses for delete to authenticated using (is_admin());

create policy "Todo mundo vê as aulas" on public.lessons for select using (true);
create policy "Só admin cadastra aula" on public.lessons for insert to authenticated with check (is_admin());
create policy "Só admin edita aula" on public.lessons for update to authenticated using (is_admin());
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

create policy "Aluno vê as próprias matrículas" on public.enrollments for select
  to authenticated using (user_id = auth.uid() or is_admin());
create policy "Só admin ou o backend cria/edita matrícula" on public.enrollments for insert
  to authenticated with check (is_admin());
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

create policy "Cada um vê e marca só o próprio progresso" on public.lesson_progress
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================================================
-- 5. MATERIAIS
-- =========================================================
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'E-book',
  file_url text default '',
  free boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.materials enable row level security;
create policy "Todo mundo vê os materiais" on public.materials for select using (true);
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
  external_link text default '',
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;
create policy "Todo mundo vê os eventos" on public.events for select using (true);
create policy "Só admin gerencia eventos" on public.events for all
  to authenticated using (is_admin()) with check (is_admin());

-- =========================================================
-- 7. COMUNICADOS
-- =========================================================
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;
create policy "Todo mundo vê os comunicados" on public.announcements for select using (true);
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

create policy "Todo mundo vê as dúvidas" on public.forum_threads for select using (true);
create policy "Aluno logado publica dúvida" on public.forum_threads for insert
  to authenticated with check (author_id = auth.uid());

create policy "Todo mundo vê as respostas" on public.forum_answers for select using (true);
create policy "Aluno logado responde dúvida" on public.forum_answers for insert
  to authenticated with check (author_id = auth.uid());

-- =========================================================
-- 9. HABILITAR REALTIME (para a Central de Dúvidas atualizar sozinha na tela)
-- =========================================================
alter publication supabase_realtime add table public.forum_threads;
alter publication supabase_realtime add table public.forum_answers;

-- =========================================================
-- Pronto. Depois de rodar este script:
-- 1. Vá em Authentication > Providers e confirme que "Email" está habilitado.
-- 2. Crie seu primeiro usuário admin: cadastre-se normalmente pelo site (ou pelo
--    Authentication > Users > Add user aqui no painel) e depois rode:
--    update public.profiles set role = 'admin' where id = 'SEU-UUID-AQUI';
-- =========================================================
