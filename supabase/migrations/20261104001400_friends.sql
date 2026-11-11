-- Friends: requests, friendships (one normalized row per pair) and blocks.
-- Every list is the caller's own; other people appear with name fields only.
-- An unknown username and a block in either direction give the same
-- "unavailable" answer, so neither existence nor blocks can be probed.
-- Privacy change: friends can see each other's profiles (can_read_profile).
begin;
create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles on delete cascade,
  to_user uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default clock_timestamp(),
  check (from_user <> to_user)
);
create unique index friend_requests_pair on public.friend_requests(from_user, to_user);
create index friend_requests_to on public.friend_requests(to_user, created_at desc);
create table public.friendships (
  user_a uuid not null references public.profiles on delete cascade,
  user_b uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default clock_timestamp(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index friendships_b on public.friendships(user_b);
create table public.user_blocks (
  blocker uuid not null references public.profiles on delete cascade,
  blocked uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default clock_timestamp(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
-- Daily send counter, so declined/cancelled requests still count.
create table public.friend_request_log (
  user_id uuid not null references public.profiles on delete cascade,
  sent_at timestamptz not null default clock_timestamp()
);
create index friend_request_log_recent on public.friend_request_log(user_id, sent_at desc);

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.user_blocks enable row level security;
alter table public.friend_request_log enable row level security;
revoke all on public.friend_requests, public.friendships, public.user_blocks, public.friend_request_log
  from public, anon, authenticated;

create function private.are_friends(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.friendships
    where user_a = least(p_a, p_b) and user_b = greatest(p_a, p_b));
$$;
create function private.blocked_between(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.user_blocks
    where (blocker = p_a and blocked = p_b) or (blocker = p_b and blocked = p_a));
$$;
revoke execute on function private.are_friends(uuid, uuid), private.blocked_between(uuid, uuid) from public, anon;
grant execute on function private.are_friends(uuid, uuid), private.blocked_between(uuid, uuid) to authenticated;

-- Profiles: yourself, roommates (as before) and now friends.
create or replace function private.can_read_profile(uid uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null)
    and (uid = auth.uid()
      or exists(select 1 from public.room_members a join public.room_members b using(room_id)
        where a.user_id = auth.uid() and b.user_id = uid and a.status = 'active' and b.status = 'active')
      or private.are_friends(auth.uid(), uid));
$$;

-- Returns 'sent', 'friends' (they had asked you: now friends), 'already' or
-- 'unavailable'. Unavailable is a result, not an error, so the attempt stays
-- logged and username probing counts toward the daily limit.
create function public.send_friend_request(p_username text) returns text
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); target uuid;
begin
  if (select count(*) from public.friend_request_log where user_id = uid
      and sent_at > clock_timestamp() - interval '1 day') >= 20
     or exists(select 1 from public.friend_request_log where user_id = uid
      and sent_at > clock_timestamp() - interval '2 seconds') then
    raise exception 'slow_down';
  end if;
  insert into public.friend_request_log(user_id) values (uid);
  select id into target from public.profiles where username = lower(btrim(p_username));
  if target is null or target = uid or private.blocked_between(uid, target) then
    return 'unavailable';
  end if;
  if private.are_friends(uid, target) then return 'already'; end if;
  if exists(select 1 from public.friend_requests where from_user = target and to_user = uid) then
    delete from public.friend_requests where from_user = target and to_user = uid;
    insert into public.friendships(user_a, user_b) values (least(uid, target), greatest(uid, target));
    return 'friends';
  end if;
  insert into public.friend_requests(from_user, to_user) values (uid, target)
    on conflict (from_user, to_user) do nothing;
  return 'sent';
end $$;

create function public.respond_friend_request(p_request uuid, p_accept boolean) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); r public.friend_requests;
begin
  delete from public.friend_requests where id = p_request and to_user = uid returning * into r;
  if r.id is null then raise exception 'unavailable' using errcode = '42501'; end if;
  if p_accept and not private.blocked_between(uid, r.from_user) then
    insert into public.friendships(user_a, user_b)
      values (least(uid, r.from_user), greatest(uid, r.from_user)) on conflict do nothing;
  end if;
end $$;

create function public.cancel_friend_request(p_request uuid) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user();
begin
  delete from public.friend_requests where id = p_request and from_user = uid;
  if not found then raise exception 'unavailable' using errcode = '42501'; end if;
end $$;

create function public.remove_friend(p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user();
begin
  delete from public.friendships where user_a = least(uid, p_user) and user_b = greatest(uid, p_user);
end $$;

-- Blocking ends any friendship and pending requests in both directions.
create function public.block_user(p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user();
begin
  if p_user = uid or not exists(select 1 from public.profiles where id = p_user) then
    raise exception 'unavailable' using errcode = '42501';
  end if;
  insert into public.user_blocks(blocker, blocked) values (uid, p_user) on conflict do nothing;
  delete from public.friendships where user_a = least(uid, p_user) and user_b = greatest(uid, p_user);
  delete from public.friend_requests where (from_user = uid and to_user = p_user) or (from_user = p_user and to_user = uid);
end $$;

create function public.unblock_user(p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user();
begin
  delete from public.user_blocks where blocker = uid and blocked = p_user;
end $$;

-- The caller's friends, requests and blocks, with name fields only.
create function public.friends_overview() returns json
language plpgsql stable security definer set search_path='' as $$
declare uid uuid := private.verified_user();
begin
  return json_build_object(
    'friends', coalesce((select json_agg(json_build_object('id', p.id, 'username', p.username,
        'display_name', p.display_name, 'since', f.created_at) order by p.display_name)
      from public.friendships f
      join public.profiles p on p.id = case when f.user_a = uid then f.user_b else f.user_a end
      where uid in (f.user_a, f.user_b)), '[]'::json),
    'incoming', coalesce((select json_agg(json_build_object('id', r.id, 'user_id', p.id,
        'username', p.username, 'display_name', p.display_name, 'created_at', r.created_at)
        order by r.created_at desc)
      from public.friend_requests r join public.profiles p on p.id = r.from_user
      where r.to_user = uid), '[]'::json),
    'outgoing', coalesce((select json_agg(json_build_object('id', r.id, 'user_id', p.id,
        'username', p.username, 'display_name', p.display_name, 'created_at', r.created_at)
        order by r.created_at desc)
      from public.friend_requests r join public.profiles p on p.id = r.to_user
      where r.from_user = uid), '[]'::json),
    'blocked', coalesce((select json_agg(json_build_object('id', p.id, 'username', p.username,
        'display_name', p.display_name) order by p.display_name)
      from public.user_blocks b join public.profiles p on p.id = b.blocked
      where b.blocker = uid), '[]'::json)
  );
end $$;

-- Mutual friends with a profile the caller may see; empty otherwise.
create function public.mutual_friends(p_user uuid) returns json
language plpgsql stable security definer set search_path='' as $$
declare uid uuid := private.verified_user();
begin
  if p_user = uid or not private.can_read_profile(p_user) then return '[]'::json; end if;
  return coalesce((select json_agg(json_build_object('username', p.username, 'display_name', p.display_name)
      order by p.display_name)
    from public.profiles p
    where p.id <> uid and p.id <> p_user
      and private.are_friends(uid, p.id) and private.are_friends(p_user, p.id)), '[]'::json);
end $$;

revoke all on function public.send_friend_request(text), public.respond_friend_request(uuid, boolean),
  public.cancel_friend_request(uuid), public.remove_friend(uuid), public.block_user(uuid),
  public.unblock_user(uuid), public.friends_overview(), public.mutual_friends(uuid) from public, anon;
grant execute on function public.send_friend_request(text), public.respond_friend_request(uuid, boolean),
  public.cancel_friend_request(uuid), public.remove_friend(uuid), public.block_user(uuid),
  public.unblock_user(uuid), public.friends_overview(), public.mutual_friends(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
