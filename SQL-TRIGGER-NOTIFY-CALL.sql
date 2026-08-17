-- ============================================================
-- REINY: Trigger que llama a la Edge Function notify-call
-- (alternativa cuando no aparece Database → Webhooks)
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- 1) Extensión HTTP asíncrona
create extension if not exists pg_net with schema extensions;

-- 2) Función: al insertar una llamada "ringing", avisa a notify-call
create or replace function public.notify_call_via_edge()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  request_id bigint;
  payload jsonb;
  -- Clave anon (ya es pública en el cliente). Solo sirve para invocar la function.
  edge_url text := 'https://qxakxkbjedeozaewrevo.supabase.co/functions/v1/notify-call';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YWt4a2JqZWRlb3phZXdyZXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MDM5MTEsImV4cCI6MjEwMjM3OTkxMX0.VaiF1IFlhkrMhz0s_lIa9Qvs_yS01ShLGGmaJW9Ls_M';
begin
  if (TG_OP = 'INSERT' and NEW.status = 'ringing') then
    payload := jsonb_build_object(
      'type', 'INSERT',
      'table', 'calls',
      'record', to_jsonb(NEW)
    );

    select net.http_post(
      url := edge_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := payload
    ) into request_id;
  end if;

  return NEW;
end;
$$;

-- 3) Trigger en calls
drop trigger if exists trg_notify_call_on_insert on public.calls;
create trigger trg_notify_call_on_insert
  after insert on public.calls
  for each row
  execute function public.notify_call_via_edge();

-- 4) Asegurar Realtime (por si falta)
alter table public.calls replica identity full;

-- Listo. Comprueba:
-- select * from net._http_response order by id desc limit 5;
