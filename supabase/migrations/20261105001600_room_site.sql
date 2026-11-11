-- Shared website: a general https link the room opens for everyone, next to
-- the player. Each member's browser loads the site in its own sandboxed
-- iframe (when the site allows embedding); only the link is shared, not
-- scrolling or clicks. Sites that refuse embedding are offered in the
-- Hyperbeam shared browser (migration 1200) or a new tab instead.
-- Owners and moderators set or clear the link; active members read it.
begin;
create table public.room_sites (
  room_id uuid primary key references public.rooms on delete cascade,
  url text not null check (char_length(url) <= 2048 and url ~ '^https://[^[:space:]]+$'),
  updated_at timestamptz not null default clock_timestamp(),
  updated_by uuid references public.profiles on delete set null
);
alter table public.room_sites enable row level security;
revoke all on public.room_sites from public, anon, authenticated;
grant select(room_id, url, updated_at) on public.room_sites to authenticated;
create policy room_sites_read on public.room_sites for select to authenticated
  using (private.is_member(room_id));

-- An empty p_url clears the room's website.
create function public.set_room_site(p_room uuid, p_url text) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user();
begin
  perform 1 from public.rooms where id=p_room and closed_at is null for update;
  if not found or not exists(
    select 1 from public.room_members where room_id=p_room and user_id=uid
      and status='active' and role in ('owner','moderator')
  ) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if p_url is null or char_length(p_url) > 2048
    or (p_url <> '' and p_url !~ '^https://[^[:space:]]+$') then
    raise exception 'invalid_source' using errcode='22023';
  end if;
  if exists(select 1 from public.room_sites where room_id=p_room
      and updated_at > clock_timestamp()-interval '2 seconds') then
    raise exception 'slow_down';
  end if;
  if p_url = '' then
    delete from public.room_sites where room_id=p_room;
    return;
  end if;
  insert into public.room_sites(room_id, url, updated_at, updated_by)
    values (p_room, p_url, clock_timestamp(), uid)
    on conflict (room_id) do update set url=excluded.url,
      updated_at=excluded.updated_at, updated_by=excluded.updated_by;
end $$;
revoke all on function public.set_room_site(uuid, text) from public, anon;
grant execute on function public.set_room_site(uuid, text) to authenticated;

-- Realtime room signals (migration 1000) are optional; signal when present.
do $$
begin
  if to_regprocedure('private.signal_room_change()') is not null then
    create trigger room_sites_signal after insert or update or delete on public.room_sites
      for each row execute function private.signal_room_change();
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
