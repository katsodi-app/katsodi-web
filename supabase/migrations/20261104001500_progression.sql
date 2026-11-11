-- XP, levels and achievements. The server awards everything; clients only
-- ask (daily claim, presence heartbeat). Every award is a ledger row with a
-- unique key, so one action can never pay twice, and every kind has a daily
-- cap. Amounts and caps live in xp_rules for future balancing.
-- Level curve: reaching level L+1 from L costs round(100 * L^1.5) XP.
begin;
create table public.xp_rules (
  kind text primary key,
  amount integer not null check (amount between 0 and 1000),
  daily_cap integer not null check (daily_cap between 0 and 1000)
);
insert into public.xp_rules(kind, amount, daily_cap) values
  ('daily_login', 10, 1),
  ('room_create', 20, 3),
  ('room_join', 5, 10),
  ('friend_add', 10, 5),
  ('room_participation', 15, 4),
  ('watch_together', 20, 3),
  ('achievement', 0, 20);

create table public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null references public.xp_rules,
  ref text not null check (char_length(ref) between 1 and 200),
  amount integer not null check (amount >= 0),
  created_at timestamptz not null default clock_timestamp(),
  unique (user_id, kind, ref)
);
create index xp_events_daily on public.xp_events(user_id, kind, created_at desc);
alter table public.profiles add column xp_total integer not null default 0 check (xp_total >= 0);

create table public.achievements (
  id text primary key,
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  xp integer not null check (xp between 25 and 200),
  sort integer not null
);
insert into public.achievements(id, rarity, xp, sort) values
  ('first_steps', 'common', 25, 1),
  ('room_creator', 'rare', 75, 2),
  ('social_butterfly', 'rare', 75, 3),
  ('movie_marathon', 'epic', 120, 4),
  ('music_enthusiast', 'epic', 150, 5),
  ('community_veteran', 'epic', 150, 6),
  ('legendary_member', 'legendary', 200, 7);
create table public.user_achievements (
  user_id uuid not null references public.profiles on delete cascade,
  achievement_id text not null references public.achievements,
  unlocked_at timestamptz not null default clock_timestamp(),
  primary key (user_id, achievement_id)
);

-- Presence heartbeats: one row per user, room and UTC day.
create table public.room_presence (
  user_id uuid not null references public.profiles on delete cascade,
  room_id uuid not null references public.rooms on delete cascade,
  day date not null,
  minutes integer not null default 0,
  watch_minutes integer not null default 0,
  last_ping timestamptz not null default clock_timestamp(),
  primary key (user_id, room_id, day)
);
create index room_presence_room on public.room_presence(room_id, last_ping desc);

alter table public.xp_rules enable row level security;
alter table public.xp_events enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.room_presence enable row level security;
revoke all on public.xp_rules, public.xp_events, public.achievements, public.user_achievements,
  public.room_presence from public, anon, authenticated;
-- The total is server-maintained: not part of the client-updatable columns.
revoke update on public.profiles from authenticated;
grant update(username, display_name, bio, onboarding_completed) on public.profiles to authenticated;

-- Level for a total, plus XP into the level and the cost of the next one.
create function public.level_progress(p_xp integer)
returns table(level integer, into_level integer, next_level integer)
language plpgsql immutable set search_path='' as $$
declare l integer := 1; rest integer := greatest(p_xp, 0); need integer;
begin
  loop
    need := round(100 * power(l, 1.5));
    exit when rest < need or l >= 1000;
    rest := rest - need;
    l := l + 1;
  end loop;
  return query select l, rest, need;
end $$;

create function private.unlock_achievements(p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
declare a record; met boolean; lvl integer; pass integer := 0; changed boolean := true;
begin
  -- Achievement XP can raise the level, so re-check a few times.
  while changed and pass < 3 loop
    changed := false;
    pass := pass + 1;
    select level into lvl from public.level_progress((select xp_total from public.profiles where id = p_user));
    for a in select * from public.achievements where id not in
        (select achievement_id from public.user_achievements where user_id = p_user) loop
      met := case a.id
        when 'first_steps' then exists(select 1 from public.xp_events where user_id = p_user and kind = 'room_join')
        when 'room_creator' then (select count(*) from public.xp_events where user_id = p_user and kind = 'room_create') >= 10
        when 'social_butterfly' then (select count(*) from public.xp_events where user_id = p_user and kind = 'friend_add') >= 10
        when 'movie_marathon' then (select count(*) from public.xp_events e join public.rooms r on r.id::text = split_part(e.ref, ':', 1)
          where e.user_id = p_user and e.kind = 'watch_together' and r.format = 'video') >= 20
        when 'music_enthusiast' then (select count(*) from public.xp_events e join public.rooms r on r.id::text = split_part(e.ref, ':', 1)
          where e.user_id = p_user and e.kind = 'watch_together' and r.format = 'music') >= 50
        when 'community_veteran' then lvl >= 25
        when 'legendary_member' then lvl >= 100
        else false end;
      if met then
        insert into public.user_achievements(user_id, achievement_id) values (p_user, a.id) on conflict do nothing;
        if found then
          perform private.award(p_user, 'achievement', a.id, a.xp, false);
          changed := true;
        end if;
      end if;
    end loop;
  end loop;
end $$;

-- Pays once per (user, kind, ref) and within the kind's daily cap.
-- p_amount overrides the rule amount (achievements carry their own XP).
create function private.award(p_user uuid, p_kind text, p_ref text, p_amount integer default null,
  p_check boolean default true) returns boolean
language plpgsql security definer set search_path='' as $$
declare rule public.xp_rules; amount integer;
begin
  select * into rule from public.xp_rules where kind = p_kind;
  if rule.kind is null or p_user is null then return false; end if;
  if (select count(*) from public.xp_events where user_id = p_user and kind = p_kind
      and created_at >= date_trunc('day', clock_timestamp() at time zone 'utc') at time zone 'utc') >= rule.daily_cap then
    return false;
  end if;
  amount := coalesce(p_amount, rule.amount);
  insert into public.xp_events(user_id, kind, ref, amount) values (p_user, p_kind, p_ref, amount)
    on conflict (user_id, kind, ref) do nothing;
  if not found then return false; end if;
  update public.profiles set xp_total = xp_total + amount where id = p_user;
  if p_check then perform private.unlock_achievements(p_user); end if;
  return true;
end $$;
revoke execute on function private.award(uuid, text, text, integer, boolean),
  private.unlock_achievements(uuid) from public, anon, authenticated;

-- Daily login: once per UTC day.
create function public.claim_daily_xp() returns boolean
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user();
begin
  return private.award(uid, 'daily_login', to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD'));
end $$;

-- Heartbeat from an open, visible room. Counts at most one minute per 50 s;
-- 15 minutes pays participation, 30 minutes of shared playback with another
-- present member pays watch_together, each once per room and UTC day.
create function public.room_presence_ping(p_room uuid) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := private.verified_user(); today date := (clock_timestamp() at time zone 'utc')::date;
  p public.room_presence; watching boolean := false;
begin
  if not private.is_member(p_room) or exists(select 1 from public.rooms where id = p_room and closed_at is not null) then
    return;
  end if;
  insert into public.room_presence(user_id, room_id, day, last_ping)
    values (uid, p_room, today, clock_timestamp() - interval '1 minute')
    on conflict (user_id, room_id, day) do nothing;
  select * into p from public.room_presence where user_id = uid and room_id = p_room and day = today for update;
  if p.last_ping > clock_timestamp() - interval '50 seconds' then return; end if;
  if to_regclass('public.room_playback') is not null then
    execute 'select exists(select 1 from public.room_playback where room_id = $1 and state = ''playing'')'
      into watching using p_room;
  end if;
  watching := watching and exists(select 1 from public.room_presence o where o.room_id = p_room
    and o.user_id <> uid and o.last_ping > clock_timestamp() - interval '90 seconds'
    and exists(select 1 from public.room_members m where m.room_id = p_room and m.user_id = o.user_id and m.status = 'active'));
  update public.room_presence set minutes = minutes + 1,
      watch_minutes = watch_minutes + case when watching then 1 else 0 end,
      last_ping = clock_timestamp()
    where user_id = uid and room_id = p_room and day = today
    returning * into p;
  if p.minutes >= 15 then perform private.award(uid, 'room_participation', p_room::text || ':' || today::text); end if;
  if p.watch_minutes >= 30 then perform private.award(uid, 'watch_together', p_room::text || ':' || today::text); end if;
end $$;

-- Room creation and joining someone else's room.
create function private.award_room_activity() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_table_name = 'rooms' then
    perform private.award(new.owner_id, 'room_create', new.id::text);
  elsif new.status = 'active' and new.role <> 'owner'
      and (tg_op = 'INSERT' or old.status <> 'active') then
    perform private.award(new.user_id, 'room_join', new.room_id::text);
  end if;
  return null;
end $$;
revoke execute on function private.award_room_activity() from public, anon, authenticated;
create trigger rooms_award_xp after insert on public.rooms
  for each row execute function private.award_room_activity();
create trigger room_members_award_xp after insert or update of status on public.room_members
  for each row execute function private.award_room_activity();

-- New friendships (migration 1400 is optional): both people, once per pair.
create function private.award_friendship() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform private.award(new.user_a, 'friend_add', new.user_b::text);
  perform private.award(new.user_b, 'friend_add', new.user_a::text);
  return null;
end $$;
revoke execute on function private.award_friendship() from public, anon, authenticated;
do $$
begin
  if to_regclass('public.friendships') is not null then
    create trigger friendships_award_xp after insert on public.friendships
      for each row execute function private.award_friendship();
  end if;
end $$;

-- Level, progress and achievements of a profile the caller may see.
create function public.profile_progress(p_user uuid) returns json
language plpgsql stable security definer set search_path='' as $$
declare total integer; lp record; own boolean := p_user = auth.uid();
begin
  if not private.can_read_profile(p_user) then return null; end if;
  select xp_total into total from public.profiles where id = p_user;
  select * into lp from public.level_progress(total);
  return json_build_object(
    'xp', total, 'level', lp.level, 'into_level', lp.into_level, 'next_level', lp.next_level,
    'achievements', coalesce((select json_agg(json_build_object('id', a.id, 'rarity', a.rarity, 'xp', a.xp,
        'unlocked_at', u.unlocked_at) order by a.sort)
      from public.achievements a
      left join public.user_achievements u on u.achievement_id = a.id and u.user_id = p_user
      -- Others see only unlocked achievements; you also see what is left.
      where u.user_id is not null or own), '[]'::json)
  );
end $$;

revoke all on function public.claim_daily_xp(), public.room_presence_ping(uuid), public.profile_progress(uuid)
  from public, anon;
grant execute on function public.claim_daily_xp(), public.room_presence_ping(uuid), public.profile_progress(uuid)
  to authenticated;
grant execute on function public.level_progress(integer) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
