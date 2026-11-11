-- Shared browser sessions (Hyperbeam). One live session per room.
-- The Hyperbeam API key never reaches the database or the browser: the app
-- server creates/deletes sessions and grants control; this schema records
-- which session belongs to a room and who may see it.
-- An embed URL is a bearer capability: whoever has it can keep watching.
-- So a kick, a host losing host rights (demoted or left) or closing the room
-- REVOKES the session (flag), and the next room refresh by a remaining member
-- makes the server delete it at Hyperbeam. An ordinary member leaving does
-- not end the session.
begin;
create table public.room_browser (
  room_id uuid primary key references public.rooms on delete cascade,
  session_id text not null check (char_length(session_id) between 8 and 128),
  embed_url text not null check (char_length(embed_url) <= 2048 and embed_url ~ '^https://[^[:space:]]+$'),
  current_url text check (current_url is null or (char_length(current_url) <= 2048 and current_url ~ '^https?://[^[:space:]]+$')),
  started_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  url_updated_at timestamptz,
  revoked boolean not null default false
);
alter table public.room_browser enable row level security;
revoke all on public.room_browser from public, anon, authenticated;

create function private.is_room_host(p_room uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null)
    and exists(select 1 from public.rooms where id=p_room and closed_at is null)
    and exists(select 1 from public.room_members where room_id=p_room and user_id=auth.uid()
      and status='active' and role in ('owner','moderator'));
$$;
revoke execute on function private.is_room_host(uuid) from public, anon;
grant execute on function private.is_room_host(uuid) to authenticated;

-- Checked by the app server BEFORE it spends money on a Hyperbeam session.
create function public.can_host_room_browser(p_room uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select private.is_room_host(p_room);
$$;

-- Records a new session; returns the previous session id to delete, if any.
create function public.set_room_browser(p_room uuid, p_session text, p_embed text) returns text
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); previous text;
begin
  perform 1 from public.rooms where id=p_room for update;
  if not private.is_room_host(p_room) then raise exception 'forbidden' using errcode='42501'; end if;
  select session_id into previous from public.room_browser where room_id=p_room;
  insert into public.room_browser(room_id, session_id, embed_url, started_by)
    values (p_room, p_session, p_embed, uid)
    on conflict (room_id) do update set session_id=excluded.session_id, embed_url=excluded.embed_url,
      started_by=excluded.started_by, created_at=clock_timestamp(), current_url=null,
      url_updated_at=null, revoked=false;
  return previous;
end $$;

-- Host ends the session; returns its id so the server can delete it.
create function public.end_room_browser(p_room uuid) returns text
language plpgsql security definer set search_path='' as $$
declare ended text;
begin
  perform private.verified_user();
  if not private.is_room_host(p_room) then raise exception 'forbidden' using errcode='42501'; end if;
  delete from public.room_browser where room_id=p_room returning session_id into ended;
  return ended;
end $$;

-- What an active member may see: the embed URL and the host's current address.
create function public.get_room_browser(p_room uuid) returns json
language plpgsql stable security definer set search_path='' as $$
declare b public.room_browser;
begin
  if not private.is_member(p_room) then raise exception 'forbidden' using errcode='42501'; end if;
  select * into b from public.room_browser where room_id=p_room;
  if b.room_id is null or b.revoked then return null; end if;
  return json_build_object('embed_url', b.embed_url, 'current_url', b.current_url, 'started_at', b.created_at);
end $$;

-- Host's browser reports its address (at most once per second).
create function public.set_room_browser_url(p_room uuid, p_url text) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform private.verified_user();
  if not private.is_room_host(p_room) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_url is null or char_length(p_url) > 2048 or p_url !~ '^https?://[^[:space:]]+$' then
    raise exception 'invalid_url' using errcode='22023';
  end if;
  update public.room_browser set current_url=p_url, url_updated_at=clock_timestamp()
    where room_id=p_room and not revoked
      and (url_updated_at is null or url_updated_at < clock_timestamp()-interval '1 second');
end $$;

-- Any remaining active member's refresh claims a revoked session exactly once;
-- the app server then deletes it at Hyperbeam.
create function public.claim_room_browser_revocation(p_room uuid) returns text
language plpgsql security definer set search_path='' as $$
declare ended text;
begin
  if not private.is_member(p_room) then return null; end if;
  delete from public.room_browser where room_id=p_room and revoked returning session_id into ended;
  return ended;
end $$;

create function private.revoke_room_browser() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_table_name = 'rooms' then
    if new.closed_at is not null and old.closed_at is null then
      update public.room_browser set revoked=true where room_id=new.id;
    end if;
  -- Kicked anyone, or a host who loses host rights in any way (demoted, left):
  -- Hyperbeam control was granted to their connection, so only ending the
  -- session takes it back. An ordinary member leaving does not end it.
  elsif old.status='active' and (new.status='kicked'
      or (old.role in ('owner','moderator') and (new.role='member' or new.status<>'active'))) then
    update public.room_browser set revoked=true where room_id=new.room_id;
  end if;
  return null;
end $$;
revoke execute on function private.revoke_room_browser() from public, anon, authenticated;
create trigger room_browser_revoke_on_member after update of status, role on public.room_members
  for each row execute function private.revoke_room_browser();
create trigger room_browser_revoke_on_close after update of closed_at on public.rooms
  for each row execute function private.revoke_room_browser();

-- Realtime room signals (migration 1000) are optional; signal when present.
do $$
begin
  if to_regprocedure('private.signal_room_change()') is not null then
    create trigger room_browser_signal after insert or update or delete on public.room_browser
      for each row execute function private.signal_room_change();
  end if;
end $$;

revoke all on function public.can_host_room_browser(uuid), public.set_room_browser(uuid,text,text),
  public.end_room_browser(uuid), public.get_room_browser(uuid), public.set_room_browser_url(uuid,text),
  public.claim_room_browser_revocation(uuid) from public, anon;
grant execute on function public.can_host_room_browser(uuid), public.set_room_browser(uuid,text,text),
  public.end_room_browser(uuid), public.get_room_browser(uuid), public.set_room_browser_url(uuid,text),
  public.claim_room_browser_revocation(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
