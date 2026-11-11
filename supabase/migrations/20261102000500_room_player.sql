-- Shared source selection; external embeds do not imply synchronized playback.
begin;
alter table public.rooms add column source_updated_at timestamptz;
create function public.set_room_source(p_room uuid, p_url text) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user();
begin
  perform 1 from public.rooms where id=p_room and closed_at is null for update;
  if not found or not exists(select 1 from public.room_members where room_id=p_room and user_id=uid and status='active' and role in ('owner','moderator')) then
    raise exception 'room_unavailable' using errcode='42501';
  end if;
  if p_url is null or char_length(p_url)>2048 or (p_url<>'' and p_url !~ '^https://[^[:space:]]+$') then raise exception 'invalid_source' using errcode='22023'; end if;
  if exists(select 1 from public.rooms where id=p_room and source_updated_at>clock_timestamp()-interval '2 seconds') then raise exception 'slow_down'; end if;
  update public.rooms set url=p_url, source_updated_at=clock_timestamp() where id=p_room;
end $$;
revoke all on function public.set_room_source(uuid,text) from public,anon;
grant execute on function public.set_room_source(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
