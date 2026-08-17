-- ============================================
-- REINY — Schema completo para Supabase
-- Ejecutar en: SQL Editor del proyecto
-- ============================================

-- Perfiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  banner_url text,
  bio text,
  font text default '''VT323'', monospace',
  bubble_style text default 'classic',
  colors jsonb default '{}',
  profile_anim text default 'none',
  profile_sticker text default 'none',
  profile_frame text default 'none',
  onboarding_done boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Amistades (pending → accepted, nunca auto-add)
create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  friend_id uuid references public.profiles(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz default now(),
  unique(user_id, friend_id)
);

-- Mensajes 1:1
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  sender_id uuid references public.profiles(id) on delete cascade,
  receiver_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- Grupos (con foto, banner y tema)
create table if not exists public.groups (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  avatar_url text,
  banner_url text,
  theme text default 'classic',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.group_members (
  group_id bigint references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member' check (role in ('admin', 'mod', 'member')),
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- Mensajes de grupo
create table if not exists public.group_messages (
  id bigint generated always as identity primary key,
  group_id bigint references public.groups(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- Estados (texto / foto / video / audio)
create table if not exists public.statuses (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  content text,
  media_url text,
  media_type text check (media_type in ('image', 'video', 'audio', null)),
  expires_at timestamptz default (now() + interval '24 hours'),
  created_at timestamptz default now()
);

-- Reels
create table if not exists public.reels (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  caption text,
  video_url text,
  likes_count int default 0,
  created_at timestamptz default now()
);

create table if not exists public.reel_likes (
  reel_id bigint references public.reels(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (reel_id, user_id)
);

create table if not exists public.reel_comments (
  id bigint generated always as identity primary key,
  reel_id bigint references public.reels(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- ========== RLS ==========
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.messages enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_messages enable row level security;
alter table public.statuses enable row level security;
alter table public.reels enable row level security;
alter table public.reel_likes enable row level security;
alter table public.reel_comments enable row level security;

-- Profiles
create policy "Public profiles viewable" on public.profiles for select using (true);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- Friendships
create policy "View own friendships" on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "Create friendship request" on public.friendships for insert
  with check (auth.uid() = user_id);
create policy "Update friendship" on public.friendships for update
  using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "Delete friendship" on public.friendships for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- Messages
create policy "View own messages" on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Send messages" on public.messages for insert
  with check (auth.uid() = sender_id);

-- Groups
create policy "Anyone view groups" on public.groups for select using (true);
create policy "Auth create groups" on public.groups for insert
  with check (auth.uid() = created_by);
create policy "Creator update group" on public.groups for update
  using (auth.uid() = created_by);

create policy "View group members" on public.group_members for select using (true);
create policy "Join or add members" on public.group_members for insert
  with check (auth.uid() = user_id or exists (
    select 1 from public.group_members gm
    where gm.group_id = group_members.group_id and gm.user_id = auth.uid() and gm.role = 'admin'
  ));

create policy "View group messages" on public.group_messages for select using (true);
create policy "Send group messages" on public.group_messages for insert
  with check (auth.uid() = sender_id);

-- Statuses
create policy "Statuses public" on public.statuses for select using (true);
create policy "Users create status" on public.statuses for insert
  with check (auth.uid() = user_id);
create policy "Users delete own status" on public.statuses for delete
  using (auth.uid() = user_id);

-- Reels
create policy "Reels public" on public.reels for select using (true);
create policy "Users insert own reels" on public.reels for insert
  with check (auth.uid() = user_id);
create policy "Users update own reels" on public.reels for update
  using (auth.uid() = user_id);
create policy "Users delete own reels" on public.reels for delete
  using (auth.uid() = user_id);

create policy "View reel likes" on public.reel_likes for select using (true);
create policy "Like reels" on public.reel_likes for insert with check (auth.uid() = user_id);
create policy "Unlike reels" on public.reel_likes for delete using (auth.uid() = user_id);

create policy "View reel comments" on public.reel_comments for select using (true);
create policy "Comment reels" on public.reel_comments for insert with check (auth.uid() = user_id);

-- ========== Realtime ==========
-- En Dashboard: Database → Replication → habilita:
-- messages, group_messages, friendships, statuses, reels

-- ========== Storage (opcional, para archivos reales) ==========
-- Crea buckets públicos: avatars, banners, groups, reels, status-media, chat-media
-- Policies ejemplo para bucket "groups":
-- allow select for all
-- allow insert/update for authenticated
