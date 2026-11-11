-- Music rooms (requires 0500 room_player, 1100 room_queue, 2000 room_lifecycle).
-- * Any active member of a music room may switch the playing track; video
--   rooms keep host-only source changes.
-- * Music rooms keep a longer queue (300) and accept a whole imported
--   playlist in one call; video rooms keep 50.
-- * Owners/moderators of a music room can mix the queue: everyone's tracks
--   are interleaved, one person after another.
-- * Lifecycle: video rooms as before (inactive after 10 empty minutes,
--   deleted after 30); a music room is deleted only after nobody has had it
--   open for 10 days.
begin;

create function private.can_switch_track(p_room uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.room_members m join public.rooms r on r.id = m.room_id
    where m.room_id = p_room and m.user_id = auth.uid() and m.status = 'active'
      and (m.role in ('owner','moderator') or r.format = 'music'));
$$;
revoke execute on function private.can_switch_track(uuid) from public, anon;
grant execute on function private.can_switch_track(uuid) to authenticated;

create or replace function public.set_room_source(p_room uuid, p_url text) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user();
begin
  perform 1 from public.rooms where id=p_room and closed_at is null for update;
  if not found or not private.can_switch_track(p_room) then
    raise exception 'room_unavailable' using errcode='42501';
  end if;
  if p_url is null or char_length(p_url)>2048 or (p_url<>'' and p_url !~ '^https://[^[:space:]]+$') then raise exception 'invalid_source' using errcode='22023'; end if;
  if exists(select 1 from public.rooms where id=p_room and source_updated_at>clock_timestamp()-interval '2 seconds') then raise exception 'slow_down'; end if;
  update public.rooms set url=p_url, source_updated_at=clock_timestamp() where id=p_room;
end $$;

create function private.queue_limit(p_room uuid) returns integer
language sql stable security definer set search_path='' as $$
  select case when format = 'music' then 300 else 50 end from public.rooms where id = p_room;
$$;
revoke execute on function private.queue_limit(uuid) from public, anon;
grant execute on function private.queue_limit(uuid) to authenticated;

create or replace function public.add_room_queue(p_room uuid, p_url text) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); iid uuid;
begin
  perform 1 from public.rooms where id=p_room and closed_at is null for update;
  if not found or not private.is_member(p_room) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_url is null or char_length(p_url) > 2048 or p_url !~ '^https://[^[:space:]]+$' then
    raise exception 'invalid_source' using errcode='22023';
  end if;
  if (select count(*) from public.room_queue where room_id=p_room) >= private.queue_limit(p_room) then raise exception 'queue_full'; end if;
  if exists(select 1 from public.room_queue where added_by=uid and created_at > clock_timestamp()-interval '2 seconds') then
    raise exception 'slow_down';
  end if;
  insert into public.room_queue(room_id, url, added_by) values (p_room, p_url, uid) returning id into iid;
  return iid;
end $$;

-- Adds an imported playlist in order; keeps what fits and returns how many.
create function public.add_room_queue_many(p_room uuid, p_urls text[]) returns integer
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); room_format text; free integer; added integer := 0; u text;
begin
  select format into room_format from public.rooms where id=p_room and closed_at is null for update;
  if not found or not private.is_member(p_room) then raise exception 'forbidden' using errcode='42501'; end if;
  if room_format <> 'music' then raise exception 'music_only' using errcode='22023'; end if;
  if p_urls is null or cardinality(p_urls) = 0 or cardinality(p_urls) > 300 then
    raise exception 'invalid_source' using errcode='22023';
  end if;
  if exists(select 1 from public.room_queue where added_by=uid and created_at > clock_timestamp()-interval '10 seconds') then
    raise exception 'slow_down';
  end if;
  free := private.queue_limit(p_room) - (select count(*) from public.room_queue where room_id=p_room);
  if free <= 0 then raise exception 'queue_full'; end if;
  foreach u in array p_urls loop
    exit when added >= free;
    if u is null or char_length(u) > 2048 or u !~ '^https://[^[:space:]]+$' then
      raise exception 'invalid_source' using errcode='22023';
    end if;
    -- Distinct timestamps keep the playlist's order.
    insert into public.room_queue(room_id, url, added_by, created_at)
      values (p_room, u, uid, clock_timestamp() + make_interval(secs => added * 0.001));
    added := added + 1;
  end loop;
  return added;
end $$;

-- Interleaves the queue by who added each track (round robin), keeping each
-- person's own order. Owners and moderators of music rooms only.
create function public.mix_room_queue(p_room uuid) returns integer
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); moved integer;
begin
  perform 1 from public.rooms where id=p_room and closed_at is null and format='music' for update;
  if not found or not exists(select 1 from public.room_members where room_id=p_room and user_id=uid
      and status='active' and role in ('owner','moderator')) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  with ranked as (
    select id,
      row_number() over (partition by added_by order by created_at, id) as turn,
      dense_rank() over (order by min_at, added_by) as person
    from (select q.*, min(created_at) over (partition by added_by) as min_at
          from public.room_queue q where room_id = p_room) s
  ), ordered as (
    select id, row_number() over (order by turn, person) as pos from ranked
  )
  update public.room_queue q set created_at = clock_timestamp() + make_interval(secs => o.pos * 0.001)
    from ordered o where q.id = o.id;
  get diagnostics moved = row_count;
  return moved;
end $$;

-- In a music room any member can play, pause and seek the shared track
-- (otherwise a switched track waits for a host to press play).
create or replace function public.set_room_playback(p_room uuid, p_source text, p_state text, p_position double precision)
returns json language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); r public.rooms;
begin
  select * into r from public.rooms where id=p_room and closed_at is null for update;
  if not found or not private.can_switch_track(p_room) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if p_source is distinct from r.url or r.url='' then raise exception 'stale_source' using errcode='22023'; end if;
  if p_state is null or p_state not in ('playing','paused') or p_position is null
    or p_position < 0 or p_position > 172800 then
    raise exception 'invalid_playback' using errcode='22023';
  end if;
  if exists(select 1 from public.room_playback where room_id=p_room and updated_at>clock_timestamp()-interval '200 milliseconds') then
    raise exception 'slow_down';
  end if;
  insert into public.room_playback(room_id,source_url,state,position,updated_at,updated_by)
    values(p_room,r.url,p_state,p_position,clock_timestamp(),uid)
    on conflict(room_id) do update set source_url=excluded.source_url,state=excluded.state,
      position=excluded.position,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
  return public.get_room_playback(p_room);
end $$;

revoke all on function public.add_room_queue_many(uuid, text[]), public.mix_room_queue(uuid) from public, anon;
grant execute on function public.add_room_queue_many(uuid, text[]), public.mix_room_queue(uuid) to authenticated;

create or replace function public.run_room_lifecycle()
returns table(inactive integer, deleted integer)
language plpgsql security definer set search_path='' as $$
declare marked integer; removed integer;
begin
  update public.rooms set inactive_at = clock_timestamp()
    where format = 'video' and inactive_at is null
      and last_occupied_at < clock_timestamp() - interval '10 minutes';
  get diagnostics marked = row_count;
  with gone as (
    delete from public.rooms
      where (format = 'video' and last_occupied_at < clock_timestamp() - interval '30 minutes')
         or (format = 'music' and last_occupied_at < clock_timestamp() - interval '10 days')
      returning id
  )
  insert into public.room_storage_cleanup(room_id) select id from gone
    on conflict (room_id) do nothing;
  get diagnostics removed = row_count;
  return query select marked, removed;
end $$;
revoke all on function public.run_room_lifecycle() from public, anon, authenticated;
grant execute on function public.run_room_lifecycle() to service_role;

notify pgrst, 'reload schema';
commit;
