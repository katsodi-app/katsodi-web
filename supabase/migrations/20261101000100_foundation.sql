-- Katsodi server foundation. No service-role key is used by application requests.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z][a-z0-9_]{2,23}$'),
  display_name text not null default 'Katsodi' check (char_length(btrim(display_name)) between 2 and 40),
  bio text not null default '' check (char_length(bio) <= 280),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.fandoms (
  id text primary key, name text not null,
  category text not null check (category in ('cinema','anime','games','music','books','sport'))
);
create table public.user_fandoms (
  user_id uuid not null references public.profiles on delete cascade,
  fandom_id text not null references public.fandoms,
  primary key(user_id,fandom_id)
);
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles,
  name text not null check (char_length(btrim(name)) between 3 and 80),
  description text not null default '' check (char_length(description) <= 500),
  format text not null check (format in ('video','music')),
  visibility text not null check (visibility in ('public','private')),
  url text not null default '' check (char_length(url) <= 2048 and (url = '' or url ~ '^https://[^[:space:]]+$')),
  art text not null default 'orbit' check (art in ('orbit','wave','moon','sun')),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.room_members (
  room_id uuid not null references public.rooms on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  role text not null check (role in ('owner','moderator','member')),
  status text not null default 'active' check (status in ('active','left','kicked')),
  joined_at timestamptz not null default now(),
  primary key(room_id,user_id)
);
create table public.room_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  max_uses integer not null check (max_uses between 1 and 100),
  uses integer not null default 0 check (uses >= 0 and uses <= max_uses),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms on delete cascade,
  sender_id uuid not null references public.profiles,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index rooms_public_catalog on public.rooms(created_at desc) where visibility='public' and closed_at is null;
create index room_members_user on public.room_members(user_id,room_id) where status='active';
create index room_messages_timeline on public.room_messages(room_id,created_at desc,id);

create function private.provision_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,username) values(new.id,'u_'||substr(encode(sha256(convert_to(new.id::text,'UTF8')),'hex'),1,20));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.provision_profile();
insert into public.profiles(id,username) select id,'u_'||substr(encode(sha256(convert_to(id::text,'UTF8')),'hex'),1,20) from auth.users on conflict(id) do nothing;

create function private.verified_user() returns uuid language plpgsql stable security definer set search_path='' as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  return uid;
end $$;
create function private.is_member(rid uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) and exists(select 1 from public.room_members where room_id=rid and user_id=auth.uid() and status='active');
$$;
create function private.is_owner(rid uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) and exists(select 1 from public.rooms where id=rid and owner_id=auth.uid());
$$;
create function private.can_read_profile(uid uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) and (uid=auth.uid() or exists(select 1 from public.room_members a join public.room_members b using(room_id)
    where a.user_id=auth.uid() and b.user_id=uid and a.status='active' and b.status='active'));
$$;
alter table public.profiles enable row level security;
alter table public.fandoms enable row level security;
alter table public.user_fandoms enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_invites enable row level security;
alter table public.room_messages enable row level security;

revoke all on public.profiles,public.fandoms,public.user_fandoms,public.rooms,public.room_members,public.room_invites,public.room_messages from public,anon,authenticated;
grant select on public.fandoms,public.rooms to anon,authenticated;
grant select on public.profiles,public.user_fandoms,public.room_members,public.room_messages to authenticated;
grant update(username,display_name,bio,onboarding_completed) on public.profiles to authenticated;
grant select(id,room_id,expires_at,max_uses,uses,revoked_at,created_at) on public.room_invites to authenticated;
create policy profiles_read on public.profiles for select to authenticated using(private.can_read_profile(id));
create policy profiles_edit on public.profiles for update to authenticated using(id=auth.uid() and private.can_read_profile(id)) with check(id=auth.uid() and private.can_read_profile(id));
create policy fandoms_read on public.fandoms for select using(true);
create policy user_fandoms_read on public.user_fandoms for select to authenticated using(user_id=auth.uid() and private.can_read_profile(user_id));
create policy rooms_read on public.rooms for select using((visibility='public' and closed_at is null) or private.is_member(id) or private.is_owner(id));
-- Anonymous users need the helper only for the public room policy; it returns false for auth.uid() = null.
grant usage on schema private to anon;
create policy members_read on public.room_members for select to authenticated using(private.is_member(room_id));
create policy invites_read on public.room_invites for select to authenticated using(private.is_owner(room_id));
create policy messages_read on public.room_messages for select to authenticated using(private.is_member(room_id));

create function public.create_room(p_name text,p_description text,p_format text,p_visibility text,p_url text,p_art text)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); rid uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  if (select count(*) from public.rooms where owner_id=uid and closed_at is null)>=20 then raise exception 'room_limit'; end if;
  insert into public.rooms(owner_id,name,description,format,visibility,url,art)
    values(uid,btrim(p_name),btrim(p_description),p_format,p_visibility,p_url,p_art) returning id into rid;
  insert into public.room_members(room_id,user_id,role) values(rid,uid,'owner');
  return rid;
end $$;
create function public.join_room(p_room uuid) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user();
begin
  perform 1 from public.rooms where id=p_room and visibility='public' and closed_at is null for update;
  if not found then raise exception 'room_unavailable' using errcode='42501'; end if;
  if exists(select 1 from public.room_members where room_id=p_room and user_id=uid and status='kicked') then raise exception 'room_unavailable' using errcode='42501'; end if;
  insert into public.room_members(room_id,user_id,role) values(p_room,uid,'member')
    on conflict(room_id,user_id) do update set status='active',joined_at=now();
end $$;
create function public.create_room_invite(p_room uuid,p_hash text,p_max_uses integer default 10)
returns uuid language plpgsql security definer set search_path='' as $$
declare iid uuid;
begin
  perform private.verified_user();
  perform 1 from public.rooms where id=p_room and owner_id=auth.uid() and closed_at is null for update;
  if not found then raise exception 'forbidden' using errcode='42501'; end if;
  if (select count(*) from public.room_invites where room_id=p_room and revoked_at is null and expires_at>now())>=20 then raise exception 'invite_limit'; end if;
  insert into public.room_invites(room_id,token_hash,max_uses,expires_at) values(p_room,p_hash,p_max_uses,now()+interval '24 hours') returning id into iid;
  return iid;
end $$;
create function public.redeem_room_invite(p_token text) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); invite public.room_invites; r public.rooms;
begin
  if p_token !~ '^[A-Za-z0-9_-]{43}$' then raise exception 'invite_unavailable' using errcode='42501'; end if;
  select * into invite from public.room_invites where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
  if not found or invite.revoked_at is not null or invite.expires_at<=now() or invite.uses>=invite.max_uses then
    raise exception 'invite_unavailable' using errcode='42501';
  end if;
  select * into r from public.rooms where id=invite.room_id for update;
  if r.closed_at is not null or exists(select 1 from public.room_members where room_id=r.id and user_id=uid and status='kicked') then raise exception 'invite_unavailable' using errcode='42501'; end if;
  if not exists(select 1 from public.room_members where room_id=r.id and user_id=uid and status='active') then
    insert into public.room_members(room_id,user_id,role) values(r.id,uid,'member')
      on conflict(room_id,user_id) do update set status='active',joined_at=now();
    update public.room_invites set uses=uses+1 where id=invite.id;
  end if;
  return r.id;
end $$;
create function public.revoke_room_invite(p_invite uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.verified_user();
  update public.room_invites set revoked_at=now() where id=p_invite and private.is_owner(room_id);
  if not found then raise exception 'forbidden' using errcode='42501'; end if;
end $$;
create function public.send_room_message(p_room uuid,p_body text) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); mid uuid;
begin
  -- Serialize with kicks/close/join to check membership at the mutation boundary.
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  perform 1 from public.rooms where id=p_room and closed_at is null for update;
  if not found or not private.is_member(p_room) then raise exception 'forbidden' using errcode='42501'; end if;
  if exists(select 1 from public.room_messages where sender_id=uid and created_at>now()-interval '1 second') then raise exception 'slow_down'; end if;
  insert into public.room_messages(room_id,sender_id,body) values(p_room,uid,btrim(p_body)) returning id into mid;
  return mid;
end $$;
create function public.moderate_room(p_room uuid,p_user uuid,p_action text) returns void language plpgsql security definer set search_path='' as $$
declare caller_role text; target_role text;
begin
  perform private.verified_user();
  perform 1 from public.rooms where id=p_room for update;
  select role into caller_role from public.room_members where room_id=p_room and user_id=auth.uid() and status='active';
  select role into target_role from public.room_members where room_id=p_room and user_id=p_user;
  if p_action='leave' and p_user=auth.uid() and caller_role<>'owner' then
    update public.room_members set status='left' where room_id=p_room and user_id=p_user; return;
  end if;
  if p_action='close' and caller_role='owner' then update public.rooms set closed_at=now() where id=p_room; return; end if;
  if p_action='kick' and (caller_role='owner' or (caller_role='moderator' and target_role='member')) and target_role<>'owner' then
    update public.room_members set status='kicked' where room_id=p_room and user_id=p_user; return;
  end if;
  if p_action in ('promote','demote') and caller_role='owner' and target_role<>'owner' then
    update public.room_members set role=case when p_action='promote' then 'moderator' else 'member' end where room_id=p_room and user_id=p_user; return;
  end if;
  raise exception 'forbidden' using errcode='42501';
end $$;
create function public.delete_room_message(p_message uuid) returns void language plpgsql security definer set search_path='' as $$
declare msg public.room_messages;
begin
  perform private.verified_user();
  select * into msg from public.room_messages where id=p_message;
  if not found then raise exception 'forbidden' using errcode='42501'; end if;
  perform 1 from public.rooms where id=msg.room_id for update;
  if not found or not private.is_member(msg.room_id) then raise exception 'forbidden' using errcode='42501'; end if;
  if msg.sender_id<>auth.uid() and not exists(select 1 from public.room_members where room_id=msg.room_id and user_id=auth.uid() and role in ('owner','moderator') and status='active') then raise exception 'forbidden' using errcode='42501'; end if;
  delete from public.room_messages where id=p_message;
end $$;
create function public.set_my_fandoms(p_ids text[]) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user();
begin
  if cardinality(p_ids)>150 or exists(select 1 from unnest(p_ids) x where not exists(select 1 from public.fandoms where id=x)) then raise exception 'invalid_fandoms'; end if;
  delete from public.user_fandoms where user_id=uid;
  insert into public.user_fandoms(user_id,fandom_id) select uid,x from (select distinct unnest(p_ids) x) s;
end $$;
create function public.update_my_profile(p_username text,p_display_name text,p_bio text,p_fandoms text[])
returns void language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user();
begin
  update public.profiles set username=p_username,display_name=btrim(p_display_name),bio=btrim(p_bio),onboarding_completed=true where id=uid;
  perform public.set_my_fandoms(p_fandoms);
end $$;

-- Functions are not publicly executable by default. Helpers accept only the caller's identity.
revoke execute on all functions in schema private from public;
grant execute on function private.is_member(uuid),private.is_owner(uuid) to anon,authenticated;
grant execute on function private.can_read_profile(uuid) to authenticated;
revoke execute on function public.create_room(text,text,text,text,text,text),public.join_room(uuid),public.create_room_invite(uuid,text,integer),
  public.redeem_room_invite(text),public.revoke_room_invite(uuid),public.send_room_message(uuid,text),public.moderate_room(uuid,uuid,text),public.delete_room_message(uuid),public.set_my_fandoms(text[]),public.update_my_profile(text,text,text,text[]) from public,anon;
grant execute on function public.create_room(text,text,text,text,text,text),public.join_room(uuid),public.create_room_invite(uuid,text,integer),
  public.redeem_room_invite(text),public.revoke_room_invite(uuid),public.send_room_message(uuid,text),public.moderate_room(uuid,uuid,text),public.delete_room_message(uuid),public.set_my_fandoms(text[]),public.update_my_profile(text,text,text,text[]) to authenticated;
commit;
