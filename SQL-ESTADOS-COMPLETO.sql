-- =============================================
-- REINY: ESTADOS + REELS (ejecutar TODO en SQL Editor)
-- Proyecto: qxakxkbjedeozaewrevo
-- =============================================

-- 1) TABLA STATUSES
create table if not exists public.statuses (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text,
  media_url text,
  media_type text check (media_type is null or media_type in ('image', 'video', 'audio')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists statuses_expires_at_idx on public.statuses (expires_at desc);
create index if not exists statuses_user_id_idx on public.statuses (user_id);

alter table public.statuses enable row level security;

drop policy if exists "Statuses public read" on public.statuses;
drop policy if exists "Statuses public" on public.statuses;
drop policy if exists "Users insert own status" on public.statuses;
drop policy if exists "Users create status" on public.statuses;
drop policy if exists "Users update own status" on public.statuses;
drop policy if exists "Users delete own status" on public.statuses;

create policy "Statuses public read"
  on public.statuses for select
  using (expires_at > now());

create policy "Users insert own status"
  on public.statuses for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own status"
  on public.statuses for update to authenticated
  using (auth.uid() = user_id);

create policy "Users delete own status"
  on public.statuses for delete to authenticated
  using (auth.uid() = user_id);

-- 2) TABLA REELS (si no existe)
create table if not exists public.reels (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  caption text,
  video_url text,
  likes_count int default 0,
  created_at timestamptz default now()
);

alter table public.reels enable row level security;

drop policy if exists "Reels public" on public.reels;
drop policy if exists "Reels public read" on public.reels;
drop policy if exists "Users insert own reels" on public.reels;

create policy "Reels public read" on public.reels for select using (true);
create policy "Users insert own reels" on public.reels for insert to authenticated
  with check (auth.uid() = user_id);

-- 3) STORAGE policies para bucket statuses (debe existir PUBLIC en dashboard)
drop policy if exists "Statuses public read" on storage.objects;
drop policy if exists "Statuses auth upload" on storage.objects;
drop policy if exists "Statuses auth update own" on storage.objects;
drop policy if exists "Statuses auth delete own" on storage.objects;
drop policy if exists "Public read statuses" on storage.objects;
drop policy if exists "Auth upload statuses" on storage.objects;

create policy "Public read statuses"
  on storage.objects for select
  using (bucket_id = 'statuses');

create policy "Auth upload statuses"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'statuses');

create policy "Auth update statuses"
  on storage.objects for update to authenticated
  using (bucket_id = 'statuses');

create policy "Auth delete statuses"
  on storage.objects for delete to authenticated
  using (bucket_id = 'statuses');

-- 4) STORAGE reels (por si falta)
drop policy if exists "Public read reels" on storage.objects;
drop policy if exists "Auth upload reels" on storage.objects;

create policy "Public read reels"
  on storage.objects for select
  using (bucket_id = 'reels');

create policy "Auth upload reels"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'reels');

-- Musica y color en estados
alter table public.statuses add column if not exists music_url text;
alter table public.statuses add column if not exists music_title text;
alter table public.statuses add column if not exists bg_color text;

-- Borrar propios estados
drop policy if exists "Users delete own status" on public.statuses;
create policy "Users delete own status"
  on public.statuses for delete to authenticated
  using (auth.uid() = user_id);

-- Permitir borrar estados ya expirados (limpieza automatica 24h)
drop policy if exists "Delete expired statuses" on public.statuses;
create policy "Delete expired statuses"
  on public.statuses for delete to authenticated
  using (expires_at < now());

-- Extra: intensidad CRT (opcional, para personalización)
alter table public.profiles add column if not exists crt_intensity real default 0.35;
alter table public.profiles add column if not exists profile_frame text default 'none';
alter table public.profiles add column if not exists profile_sticker text default 'none';

-- Personalización extra
alter table public.profiles add column if not exists chat_bg text default 'none';
alter table public.profiles add column if not exists chat_bg_color text default '#0b141a';

-- Presence
alter table public.profiles add column if not exists last_seen timestamptz;

-- Follows (estilo TikTok / reels)
create table if not exists public.follows (
  follower_id uuid references auth.users(id) on delete cascade,
  following_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);
alter table public.follows enable row level security;
drop policy if exists "Follows public read" on public.follows;
drop policy if exists "Users manage own follows" on public.follows;
create policy "Follows public read" on public.follows for select using (true);
create policy "Users manage own follows" on public.follows for all to authenticated
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);
