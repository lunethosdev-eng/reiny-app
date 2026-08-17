-- ========== REINY: LLAMADAS + PUSH TOKENS ==========
-- Ejecutar en Supabase → SQL Editor

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references auth.users(id) on delete cascade,
  callee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'ringing'
    check (status in ('ringing', 'accepted', 'rejected', 'ended', 'missed')),
  call_type text not null default 'audio'
    check (call_type in ('audio', 'video')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz
);

create index if not exists calls_callee_status_idx
  on public.calls (callee_id, status);
create index if not exists calls_caller_idx
  on public.calls (caller_id);

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text default 'android',
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

alter table public.calls enable row level security;
alter table public.device_tokens enable row level security;

drop policy if exists "calls_select_own" on public.calls;
create policy "calls_select_own" on public.calls
  for select using (auth.uid() = caller_id or auth.uid() = callee_id);

drop policy if exists "calls_insert_caller" on public.calls;
create policy "calls_insert_caller" on public.calls
  for insert with check (auth.uid() = caller_id);

drop policy if exists "calls_update_participants" on public.calls;
create policy "calls_update_participants" on public.calls
  for update using (auth.uid() = caller_id or auth.uid() = callee_id);

drop policy if exists "tokens_own" on public.device_tokens;
create policy "tokens_own" on public.device_tokens
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Activa Realtime para calls:
-- Database → Replication → supabase_realtime → habilitar tabla "calls"
