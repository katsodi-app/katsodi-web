-- Katsodi 2800: a demo of a window (no link). Requires 1800 (room_demos).
-- Until now every demo showed a link (posted to the chat). The desktop app
-- can also show a window or a screen straight away: such a demo has no link
-- (url is null) and posts nothing to the chat. Hosts still decide on members'
-- requests; everything else (status, pause, annotations) is unchanged.

alter table public.room_demos alter column url drop not null;
alter table public.room_demos drop constraint if exists room_demos_url_check;
alter table public.room_demos add constraint room_demos_url_check
  check (url is null or (char_length(url) <= 2048 and url ~ '^https://[^[:space:]]+$'));

-- p_url null: a window demo. A link is checked and posted to the chat as before.
create or replace function public.request_room_demo(p_room uuid, p_url text) returns text
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); d public.room_demos; host boolean;
begin
  perform 1 from public.rooms where id=p_room and closed_at is null for update;
  if not found or not private.is_member(p_room) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if p_url is not null and (char_length(p_url) > 2048 or p_url !~ '^https://[^[:space:]]+$') then
    raise exception 'invalid_source' using errcode='22023';
  end if;
  select * into d from public.room_demos where room_id=p_room;
  if private.demo_current(d) then raise exception 'demo_busy' using errcode='22023'; end if;
  if p_url is not null then
    perform public.send_room_message(p_room, p_url);
  end if;
  host := private.is_room_host(p_room, uid);
  insert into public.room_demos(room_id, user_id, url, status, requested_at, decided_by, paused_by, seen_at)
    values (p_room, uid, p_url, case when host then 'live' else 'pending' end,
      clock_timestamp(), case when host then uid end, null, clock_timestamp())
    on conflict (room_id) do update set user_id=excluded.user_id, url=excluded.url,
      status=excluded.status, requested_at=excluded.requested_at,
      decided_by=excluded.decided_by, paused_by=null, seen_at=excluded.seen_at;
  return case when host then 'live' else 'pending' end;
end $$;
