-- Room queue: links waiting to become the room's source.
-- Any active member may add (a shared watch-list); the adder or an
-- owner/moderator may remove; only owners/moderators play an item, which
-- goes through set_room_source (same URL rules and throttle) and resets the
-- shared timeline because the source changes. Requires room_player (0500).
begin;
create table public.room_queue (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms on delete cascade,
  url text not null check (char_length(url) <= 2048 and url ~ '^https://[^[:space:]]+$'),
  added_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default clock_timestamp()
);
create index room_queue_order on public.room_queue(room_id, created_at, id);
create index room_queue_adder_recent on public.room_queue(added_by, created_at desc);
alter table public.room_queue enable row level security;
revoke all on public.room_queue from public, anon, authenticated;
grant select(id, room_id, url, added_by, created_at) on public.room_queue to authenticated;
create policy room_queue_read on public.room_queue for select to authenticated
  using (private.is_member(room_id));

create function public.add_room_queue(p_room uuid, p_url text) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); iid uuid;
begin
  perform 1 from public.rooms where id=p_room and closed_at is null for update;
  if not found or not private.is_member(p_room) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_url is null or char_length(p_url) > 2048 or p_url !~ '^https://[^[:space:]]+$' then
    raise exception 'invalid_source' using errcode='22023';
  end if;
  if (select count(*) from public.room_queue where room_id=p_room) >= 50 then raise exception 'queue_full'; end if;
  if exists(select 1 from public.room_queue where added_by=uid and created_at > clock_timestamp()-interval '2 seconds') then
    raise exception 'slow_down';
  end if;
  insert into public.room_queue(room_id, url, added_by) values (p_room, p_url, uid) returning id into iid;
  return iid;
end $$;

create function public.remove_room_queue(p_item uuid) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); item public.room_queue;
begin
  select * into item from public.room_queue where id=p_item;
  if not found or not private.is_member(item.room_id) or (
    item.added_by is distinct from uid and not exists(
      select 1 from public.room_members where room_id=item.room_id and user_id=uid and status='active' and role in ('owner','moderator'))
  ) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  delete from public.room_queue where id=p_item;
end $$;

-- Plays p_item, or the oldest queued item when p_item is null.
create function public.play_room_queue(p_room uuid, p_item uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare item public.room_queue;
begin
  perform private.verified_user();
  select * into item from public.room_queue
    where room_id=p_room and (p_item is null or id=p_item)
    order by created_at, id limit 1 for update;
  if not found then raise exception 'queue_empty' using errcode='22023'; end if;
  -- Owner/moderator, open room, URL rules and the 2 s throttle live here.
  perform public.set_room_source(p_room, item.url);
  delete from public.room_queue where id=item.id;
  return item.id;
end $$;

revoke all on function public.add_room_queue(uuid,text), public.remove_room_queue(uuid), public.play_room_queue(uuid,uuid) from public, anon;
grant execute on function public.add_room_queue(uuid,text), public.remove_room_queue(uuid), public.play_room_queue(uuid,uuid) to authenticated;

-- Realtime room signals (migration 1000) are optional; signal when present.
do $$
begin
  if to_regprocedure('private.signal_room_change()') is not null then
    create trigger room_queue_signal after insert or delete on public.room_queue
      for each row execute function private.signal_room_change();
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
