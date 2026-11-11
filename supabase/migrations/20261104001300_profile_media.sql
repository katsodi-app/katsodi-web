-- Profile avatars and banners in a private bucket, plus fandoms on profiles.
-- Images follow the existing profile visibility rule (private.can_read_profile:
-- yourself, or people you share an active room with) and are served by the
-- app server, which re-encodes them on every read.
-- Privacy change: favourite fandoms become readable under that same rule
-- (previously only by their owner), so they can appear on the profile page.
begin;
alter table public.profiles
  add column avatar_path text,
  add column banner_path text,
  add column media_updated_at timestamptz,
  add constraint profile_media_paths check (
    (avatar_path is null or avatar_path ~ '^[a-f0-9-]{36}/avatar-[a-f0-9-]{36}\.webp$')
    and (banner_path is null or banner_path ~ '^[a-f0-9-]{36}/banner-[a-f0-9-]{36}\.webp$')
  );
-- Only the RPCs below write these columns.
revoke update on public.profiles from authenticated;
grant update(username, display_name, bio, onboarding_completed) on public.profiles to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('profile-media', 'profile-media', false, 524288, array['image/webp']);

-- "<user id>/<avatar|banner>-<uuid>.webp", owned by the first segment.
create function private.profile_media_owner(p_path text) returns uuid
language plpgsql immutable set search_path='' as $$
begin
  if p_path !~ '^[a-f0-9-]{36}/(avatar|banner)-[a-f0-9-]{36}\.webp$' then return null; end if;
  return split_part(p_path, '/', 1)::uuid;
exception when invalid_text_representation then return null;
end $$;
revoke execute on function private.profile_media_owner(text) from public, anon;
grant execute on function private.profile_media_owner(text) to authenticated;

-- Policies run as the caller, who cannot read auth.users directly.
create function private.is_verified() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null);
$$;
revoke execute on function private.is_verified() from public, anon;
grant execute on function private.is_verified() to authenticated;

create policy profile_media_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'profile-media'
  and private.profile_media_owner(name) = auth.uid()
  and private.is_verified()
  and (select count(*) from storage.objects where bucket_id = 'profile-media'
       and split_part(name, '/', 1) = auth.uid()::text) < 6
);
create policy profile_media_read on storage.objects for select to authenticated using (
  bucket_id = 'profile-media' and private.can_read_profile(private.profile_media_owner(name))
);
create policy profile_media_delete on storage.objects for delete to authenticated using (
  bucket_id = 'profile-media' and private.profile_media_owner(name) = auth.uid()
);

-- Points the caller's avatar/banner at an uploaded object; returns the old path.
create function public.set_profile_media(p_kind text, p_path text) returns text
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); previous text;
begin
  if p_kind not in ('avatar', 'banner') or private.profile_media_owner(p_path) is distinct from uid
     or p_path !~ ('/' || p_kind || '-') then
    raise exception 'invalid_media' using errcode = '22023';
  end if;
  if not exists(select 1 from storage.objects where bucket_id = 'profile-media' and name = p_path
     and metadata->>'mimetype' = 'image/webp' and (metadata->>'size')::bigint between 1 and 524288) then
    raise exception 'invalid_media' using errcode = '22023';
  end if;
  if exists(select 1 from public.profiles where id = uid and media_updated_at > clock_timestamp() - interval '3 seconds') then
    raise exception 'slow_down';
  end if;
  if p_kind = 'avatar' then
    select avatar_path into previous from public.profiles where id = uid;
    update public.profiles set avatar_path = p_path, media_updated_at = clock_timestamp() where id = uid;
  else
    select banner_path into previous from public.profiles where id = uid;
    update public.profiles set banner_path = p_path, media_updated_at = clock_timestamp() where id = uid;
  end if;
  return previous;
end $$;

-- Removes the caller's avatar/banner; returns the old path for deletion.
create function public.clear_profile_media(p_kind text) returns text
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); previous text;
begin
  if p_kind = 'avatar' then
    select avatar_path into previous from public.profiles where id = uid;
    update public.profiles set avatar_path = null, media_updated_at = clock_timestamp() where id = uid;
  elsif p_kind = 'banner' then
    select banner_path into previous from public.profiles where id = uid;
    update public.profiles set banner_path = null, media_updated_at = clock_timestamp() where id = uid;
  else
    raise exception 'invalid_media' using errcode = '22023';
  end if;
  return previous;
end $$;

revoke all on function public.set_profile_media(text, text), public.clear_profile_media(text) from public, anon;
grant execute on function public.set_profile_media(text, text), public.clear_profile_media(text) to authenticated;

-- Fandoms on profiles: same visibility as the profile itself.
drop policy user_fandoms_read on public.user_fandoms;
create policy user_fandoms_read on public.user_fandoms for select to authenticated
  using (private.can_read_profile(user_id));
notify pgrst, 'reload schema';
commit;
