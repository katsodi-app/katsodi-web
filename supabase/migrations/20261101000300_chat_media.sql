-- Apply after foundation + fandom seed. Does not change existing text messages.
begin;
alter table public.room_messages
  add column kind text not null default 'text',
  add column sticker_id text,
  add column image_path text,
  add column image_width integer,
  add column image_height integer,
  add column image_bytes integer,
  add constraint message_media_shape check (
    (kind='text' and sticker_id is null and image_path is null and image_width is null and image_height is null and image_bytes is null)
    or (kind='sticker' and sticker_id is not null and sticker_id in ('hey','hype','love','laugh','cozy','wow','cry','gg') and image_path is null and image_width is null and image_height is null and image_bytes is null)
    or (kind='image' and sticker_id is null and image_path is not null and image_width is not null and image_height is not null and image_bytes is not null and image_width between 1 and 1280 and image_height between 1 and 1280 and image_bytes between 1 and 393216)
  );
create unique index room_message_image_unique on public.room_messages(image_path) where image_path is not null;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('chat-images','chat-images',false,393216,array['image/webp']);

-- Parse before casting, so malformed object paths never fail unrelated policies.
create function private.media_room(p_path text) returns uuid language plpgsql immutable set search_path='' as $$
begin
  if p_path !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}\.webp$' then return null; end if;
  return split_part(p_path,'/',1)::uuid;
exception when invalid_text_representation then return null;
end $$;
create function private.can_upload_media(p_path text) returns boolean language sql stable security definer set search_path='' as $$
  select private.is_member(private.media_room(p_path)) and split_part(p_path,'/',2)=auth.uid()::text
    and exists(select 1 from public.rooms where id=private.media_room(p_path) and closed_at is null)
    and (select count(*) from storage.objects where bucket_id='chat-images' and split_part(name,'/',2)=auth.uid()::text)<100;
$$;
create function private.can_read_media(p_path text) returns boolean language sql stable security definer set search_path='' as $$
  select private.is_member(private.media_room(p_path)) and (
    split_part(p_path,'/',2)=auth.uid()::text or exists(select 1 from public.room_messages where image_path=p_path)
    or exists(select 1 from public.room_members where room_id=private.media_room(p_path) and user_id=auth.uid() and status='active' and role in ('owner','moderator')));
$$;
create function private.can_remove_media(p_path text) returns boolean language sql stable security definer set search_path='' as $$
  select private.media_room(p_path) is not null and not exists(select 1 from public.room_messages where image_path=p_path) and (
    split_part(p_path,'/',2)=auth.uid()::text or exists(select 1 from public.room_members where room_id=private.media_room(p_path) and user_id=auth.uid() and status='active' and role in ('owner','moderator') and private.is_member(room_id)));
$$;
revoke execute on function private.media_room(text),private.can_upload_media(text),private.can_read_media(text),private.can_remove_media(text) from public,anon;
grant execute on function private.media_room(text),private.can_upload_media(text),private.can_read_media(text),private.can_remove_media(text) to authenticated;
create policy chat_media_insert on storage.objects for insert to authenticated with check(bucket_id='chat-images' and private.can_upload_media(name));
create policy chat_media_read on storage.objects for select to authenticated using(bucket_id='chat-images' and private.can_read_media(name));
create policy chat_media_delete on storage.objects for delete to authenticated using(bucket_id='chat-images' and private.can_remove_media(name));
-- No UPDATE/upsert policy: a posted attachment cannot be replaced.
create function public.send_room_sticker(p_room uuid,p_sticker text) returns uuid language plpgsql security definer set search_path='' as $$
declare mid uuid;
begin
  if p_sticker is null or p_sticker not in ('hey','hype','love','laugh','cozy','wow','cry','gg') then raise exception 'invalid_sticker'; end if;
  mid := public.send_room_message(p_room,'[sticker]');
  update public.room_messages set kind='sticker',sticker_id=p_sticker where id=mid;
  return mid;
end $$;
create function public.send_room_image(p_room uuid,p_path text,p_width integer,p_height integer,p_bytes integer) returns uuid language plpgsql security definer set search_path='' as $$
declare mid uuid; uid uuid := private.verified_user();
begin
  if private.media_room(p_path) is distinct from p_room or split_part(p_path,'/',2)<>uid::text
    or not exists(select 1 from storage.objects where bucket_id='chat-images' and name=p_path and metadata->>'mimetype'='image/webp' and (metadata->>'size')::bigint=p_bytes)
    then raise exception 'invalid_image' using errcode='42501'; end if;
  mid := public.send_room_message(p_room,'[image]');
  update public.room_messages set kind='image',image_path=p_path,image_width=p_width,image_height=p_height,image_bytes=p_bytes where id=mid;
  return mid;
end $$;
create function public.chat_media_capabilities() returns boolean language plpgsql stable security definer set search_path='' as $$
begin
  perform private.verified_user();
  return exists(select 1 from storage.buckets where id='chat-images' and public=false and file_size_limit<=393216 and allowed_mime_types=array['image/webp']);
end $$;
revoke execute on function public.send_room_sticker(uuid,text),public.send_room_image(uuid,text,integer,integer,integer),public.chat_media_capabilities() from public,anon;
grant execute on function public.send_room_sticker(uuid,text),public.send_room_image(uuid,text,integer,integer,integer),public.chat_media_capabilities() to authenticated;
commit;
