-- Near-instant room updates through Supabase Realtime Broadcast.
-- Triggers send an EMPTY "changed" event on topic room:<room_id> whenever a
-- room's messages, playback, members or source change. The event carries no
-- data: clients react by re-reading the room through the existing
-- RLS-protected API, so Realtime never exposes messages or state, and the
-- auth cookie can stay HttpOnly. The topic is a public channel: anyone who
-- knows a room's UUID can see *when* it changes, not *what* changed.
-- If Realtime is unavailable (or this runs outside Supabase), signalling is
-- skipped and the write still succeeds; clients keep polling as a fallback.
begin;
create function private.signal_room(p_room uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if p_room is null then return; end if;
  begin
    perform realtime.send('{}'::jsonb, 'changed', 'room:' || p_room::text, false);
  exception when others then
    null;
  end;
end $$;
revoke execute on function private.signal_room(uuid) from public, anon, authenticated;

create function private.signal_room_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_table_name = 'rooms' then
    perform private.signal_room(coalesce(new.id, old.id));
  else
    perform private.signal_room(coalesce(new.room_id, old.room_id));
  end if;
  return null;
end $$;
revoke execute on function private.signal_room_change() from public, anon, authenticated;

create trigger room_messages_signal after insert or update or delete on public.room_messages
  for each row execute function private.signal_room_change();
create trigger room_members_signal after insert or update or delete on public.room_members
  for each row execute function private.signal_room_change();
create trigger rooms_signal after update of url, closed_at, name, description on public.rooms
  for each row execute function private.signal_room_change();
-- Shared playback (migration 0900) is optional; signal it when present.
do $$
begin
  if to_regclass('public.room_playback') is not null then
    create trigger room_playback_signal after insert or update or delete on public.room_playback
      for each row execute function private.signal_room_change();
  end if;
end $$;
commit;
