-- Zoom-style annotations on link demos (TASKS.md, task 3.2). Hosts can let
-- every member annotate; the LiveKit token gives data rights accordingly.
-- Requires 1800 (room_demos).
begin;
alter table public.room_demos
  add column annotations_open boolean not null default false;
grant select(annotations_open) on public.room_demos to authenticated;

create function public.set_demo_annotations(p_room uuid, p_open boolean) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); d public.room_demos;
begin
  perform 1 from public.rooms where id = p_room and closed_at is null for update;
  if not found or not private.is_room_host(p_room, uid) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  select * into d from public.room_demos where room_id = p_room;
  if d.status not in ('live', 'paused') or not private.demo_current(d) then
    raise exception 'demo_unavailable' using errcode='22023';
  end if;
  update public.room_demos set annotations_open = coalesce(p_open, false)
    where room_id = p_room;
end $$;
revoke all on function public.set_demo_annotations(uuid, boolean) from public, anon;
grant execute on function public.set_demo_annotations(uuid, boolean) to authenticated;

-- A new request starts closed again.
create function private.reset_demo_annotations() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.requested_at is distinct from old.requested_at then
    new.annotations_open := false;
  end if;
  return new;
end $$;
revoke execute on function private.reset_demo_annotations() from public, anon, authenticated;
create trigger room_demos_reset_annotations before update on public.room_demos
  for each row execute function private.reset_demo_annotations();

-- Signal the switch too (migration 1000 is optional).
do $$
begin
  if to_regprocedure('private.signal_room_change()') is not null then
    drop trigger if exists room_demos_signal on public.room_demos;
    create trigger room_demos_signal after insert or delete
      or update of status, user_id, url, annotations_open
      on public.room_demos for each row execute function private.signal_room_change();
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
