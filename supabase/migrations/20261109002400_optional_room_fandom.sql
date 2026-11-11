-- Rooms without an association are displayed as Other; do not invent a fandom.
begin;
create or replace function public.create_room(p_name text,p_description text,p_format text,p_visibility text,p_url text,p_art text,p_fandom_id text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); rid uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  if (select count(*) from public.rooms where owner_id=uid and closed_at is null)>=20 then raise exception 'room_limit'; end if;
  insert into public.rooms(owner_id,name,description,format,visibility,url,art,fandom_id)
    values(uid,btrim(p_name),btrim(p_description),p_format,p_visibility,p_url,p_art,nullif(p_fandom_id,'')) returning id into rid;
  insert into public.room_members(room_id,user_id,role) values(rid,uid,'owner');
  return rid;
end $$;
revoke all on function public.create_room(text,text,text,text,text,text,text) from public,anon;
grant execute on function public.create_room(text,text,text,text,text,text,text) to authenticated;
notify pgrst, 'reload schema';
commit;
