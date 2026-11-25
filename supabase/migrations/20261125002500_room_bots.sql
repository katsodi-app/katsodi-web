-- Fandom rooms with bots (owner decision 2026-11-25). Every bot is a profile
-- marked is_bot: the clients show a robot mark next to its name, count bots
-- apart from people and say so in its profile. Bots never sign in (no
-- password, an .invalid address); they only speak through the triggers below,
-- which run inside the database: no service key and no outside worker.
--
-- * A resident room (rooms.resident) belongs to its fandom bot and is never
--   marked inactive or deleted by the room lifecycle.
-- * The fandom bot answers frequently asked questions (bot_faq; spoilers are
--   sent as ||hidden text||), runs a quiz (!quiz) with scores (!score) and
--   explains itself (!help). It greets people who come in.
-- * Guest bots (bot_guests) are not tied to a fandom: while people are in a
--   resident room, up to rooms' tier of them visit it, greet, small-talk now
--   and then and answer when named. Rooms without people have no visitors.
-- * The first person in a resident room becomes its host (moderator); the
--   next one does when nobody hosts.
-- Content (bots, rooms, lines) is seeded by supabase/seed/room_bots.sql.
begin;

alter table public.profiles add column is_bot boolean not null default false;
-- Bots are public figures of their rooms: anyone may read their profile.
create policy profiles_read_bots on public.profiles for select to anon, authenticated using (is_bot);
grant select on public.profiles to anon;

alter table public.rooms add column resident boolean not null default false;

create table public.room_bots (
  room_id uuid primary key references public.rooms on delete cascade,
  fandom_bot uuid not null references public.profiles on delete cascade,
  -- How many guest bots may visit at once (1 for small fandoms, 3 for big ones).
  tier smallint not null default 1 check (tier between 1 and 3),
  last_bot_at timestamptz not null default '-infinity',
  last_greet_at timestamptz not null default '-infinity'
);
create table public.bot_guests (
  bot_id uuid primary key references public.profiles on delete cascade
);
create table public.bot_visits (
  room_id uuid not null references public.room_bots on delete cascade,
  bot_id uuid not null references public.bot_guests on delete cascade,
  until timestamptz not null,
  primary key (room_id, bot_id)
);
-- Questions people ask: every keyword (lower case, ё as е) must appear.
create table public.bot_faq (
  id bigserial primary key,
  room_id uuid not null references public.room_bots on delete cascade,
  keywords text[] not null check (cardinality(keywords) between 1 and 6),
  answer text not null check (char_length(answer) between 1 and 1500),
  spoiler boolean not null default false
);
create index bot_faq_room on public.bot_faq(room_id);
create table public.bot_quiz (
  id bigserial primary key,
  room_id uuid not null references public.room_bots on delete cascade,
  question text not null check (char_length(question) between 1 and 500),
  -- Accepted answers; the first is the one shown.
  answers text[] not null check (cardinality(answers) between 1 and 8)
);
create index bot_quiz_room on public.bot_quiz(room_id);
create table public.bot_quiz_state (
  room_id uuid primary key references public.room_bots on delete cascade,
  quiz_id bigint not null references public.bot_quiz on delete cascade,
  asked_at timestamptz not null default now()
);
create table public.bot_scores (
  room_id uuid not null references public.room_bots on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  points integer not null default 0,
  primary key (room_id, user_id)
);
-- Lines: a room's own (its fandom bot) or, with room_id null, the guests'.
-- {name} becomes the person's name, {room} the room's name.
create table public.bot_lines (
  id bigserial primary key,
  room_id uuid references public.room_bots on delete cascade,
  kind text not null check (kind in ('greet','topic','addressed','smalltalk','react','welcome')),
  body text not null check (char_length(body) between 1 and 600)
);
create index bot_lines_kind on public.bot_lines(room_id, kind);

alter table public.room_bots enable row level security;
alter table public.bot_guests enable row level security;
alter table public.bot_visits enable row level security;
alter table public.bot_faq enable row level security;
alter table public.bot_quiz enable row level security;
alter table public.bot_quiz_state enable row level security;
alter table public.bot_scores enable row level security;
alter table public.bot_lines enable row level security;
revoke all on public.room_bots, public.bot_guests, public.bot_visits, public.bot_faq, public.bot_quiz,
  public.bot_quiz_state, public.bot_scores, public.bot_lines from public, anon, authenticated;

-- Text as the bots compare it: lower case, ё as е, letters, digits and spaces.
create function private.bot_norm(p text) returns text language sql immutable set search_path='' as $$
  select btrim(regexp_replace(replace(lower(coalesce(p, '')), 'ё', 'е'), '[^[:alnum:]]+', ' ', 'g'))
$$;

create function private.bot_say(p_room uuid, p_bot uuid, p_body text, p_name text default '') returns void
language plpgsql security definer set search_path='' as $$
declare room_name text;
begin
  select name into room_name from public.rooms where id = p_room;
  -- clock_timestamp(): after the message it answers (now() is that message's
  -- transaction start, so the reply would share its time and could sort first).
  insert into public.room_messages(room_id, sender_id, body, created_at)
    values (p_room, p_bot, left(replace(replace(p_body, '{name}', coalesce(nullif(p_name, ''), 'друг')), '{room}', coalesce(room_name, '')), 2000),
            clock_timestamp());
  update public.room_bots set last_bot_at = clock_timestamp() where room_id = p_room;
end $$;

create function private.bot_line(p_room uuid, p_kind text) returns text
language sql stable security definer set search_path='' as $$
  select body from public.bot_lines where room_id is not distinct from p_room and kind = p_kind order by random() limit 1
$$;

-- Guests visit while people are around: up to the room's tier, for 30 minutes
-- after the last sign of people (a join or a message).
create function private.bot_refresh_visits(p_room uuid, p_tier integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare present integer; arrived uuid;
begin
  delete from public.bot_visits where room_id = p_room and until < clock_timestamp();
  update public.bot_visits set until = clock_timestamp() + interval '30 minutes' where room_id = p_room;
  select count(*) into present from public.bot_visits where room_id = p_room;
  if present < p_tier and random() < 0.6 then
    select g.bot_id into arrived from public.bot_guests g
      where not exists (select 1 from public.bot_visits v where v.room_id = p_room and v.bot_id = g.bot_id)
        -- a guest is in at most two rooms at once
        and (select count(*) from public.bot_visits v where v.bot_id = g.bot_id and v.until > clock_timestamp()) < 2
      order by random() limit 1;
    if arrived is not null then
      insert into public.bot_visits(room_id, bot_id, until) values (p_room, arrived, clock_timestamp() + interval '30 minutes');
    end if;
  end if;
  return arrived;
end $$;

create function private.bot_on_member() returns trigger
language plpgsql security definer set search_path='' as $$
declare rb public.room_bots; who text; arrived uuid; line text;
begin
  if new.status <> 'active' or (tg_op = 'UPDATE' and old.status = 'active') then return null; end if;
  select * into rb from public.room_bots where room_id = new.room_id;
  if not found then return null; end if;
  if exists (select 1 from public.profiles where id = new.user_id and is_bot) then return null; end if;
  -- Nobody hosts: the newcomer does.
  if new.role = 'member' and not exists (select 1 from public.room_members m join public.profiles p on p.id = m.user_id
      where m.room_id = new.room_id and m.status = 'active' and m.role in ('owner', 'moderator') and not p.is_bot) then
    update public.room_members set role = 'moderator' where room_id = new.room_id and user_id = new.user_id;
  end if;
  select display_name into who from public.profiles where id = new.user_id;
  if rb.last_greet_at < clock_timestamp() - interval '20 seconds' then
    line := private.bot_line(new.room_id, 'greet');
    if line is not null then perform private.bot_say(new.room_id, rb.fandom_bot, line, who); end if;
    update public.room_bots set last_greet_at = clock_timestamp() where room_id = new.room_id;
  end if;
  arrived := private.bot_refresh_visits(new.room_id, rb.tier);
  if arrived is not null then
    line := private.bot_line(null, 'welcome');
    if line is not null then perform private.bot_say(new.room_id, arrived, line, who); end if;
  end if;
  return null;
end $$;
create trigger room_members_bots after insert or update of status on public.room_members
  for each row execute function private.bot_on_member();

create function private.bot_on_message() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  rb public.room_bots; who text; txt text; quiz record; faq record; guest record; arrived uuid;
  bot_name text; bot_user text; pts integer; line text; top text;
begin
  if new.kind <> 'text' then return null; end if;
  select * into rb from public.room_bots where room_id = new.room_id;
  if not found then return null; end if;
  if exists (select 1 from public.profiles where id = new.sender_id and is_bot) then return null; end if;
  select display_name into who from public.profiles where id = new.sender_id;
  select private.bot_norm(display_name), username into bot_name, bot_user from public.profiles where id = rb.fandom_bot;
  txt := private.bot_norm(new.body);
  arrived := private.bot_refresh_visits(new.room_id, rb.tier);

  -- 1. An answer to the open quiz question.
  select s.quiz_id, z.question, z.answers into quiz from public.bot_quiz_state s join public.bot_quiz z on z.id = s.quiz_id
    where s.room_id = new.room_id and s.asked_at > clock_timestamp() - interval '10 minutes';
  if found and exists (select 1 from unnest(quiz.answers) a where private.bot_norm(a) <> ''
      and (' ' || txt || ' ') like ('% ' || private.bot_norm(a) || ' %')) then
    insert into public.bot_scores(room_id, user_id, points) values (new.room_id, new.sender_id, 1)
      on conflict (room_id, user_id) do update set points = public.bot_scores.points + 1 returning points into pts;
    delete from public.bot_quiz_state where room_id = new.room_id;
    perform private.bot_say(new.room_id, rb.fandom_bot,
      format('✅ {name}, верно! Ответ: %s. Очков в этой комнате: %s. Ещё вопрос — !quiz', quiz.answers[1], pts), who);
    return null;
  end if;

  -- 2. Commands.
  if txt ~ '^(quiz|квиз|викторина)( |$)' and new.body ~ '^\s*!' then
    select id, question into quiz from public.bot_quiz where room_id = new.room_id order by random() limit 1;
    if found then
      insert into public.bot_quiz_state(room_id, quiz_id, asked_at) values (new.room_id, quiz.id, clock_timestamp())
        on conflict (room_id) do update set quiz_id = excluded.quiz_id, asked_at = excluded.asked_at;
      perform private.bot_say(new.room_id, rb.fandom_bot, '❓ ' || quiz.question || ' (отвечайте в чат, 10 минут)', who);
    end if;
    return null;
  end if;
  if txt ~ '^(score|счет|очки|рейтинг)( |$)' and new.body ~ '^\s*!' then
    select string_agg(format('%s. %s — %s', n, name, points), E'\n') into top from (
      select row_number() over (order by s.points desc) n, p.display_name name, s.points
        from public.bot_scores s join public.profiles p on p.id = s.user_id
        where s.room_id = new.room_id order by s.points desc limit 5) t;
    perform private.bot_say(new.room_id, rb.fandom_bot,
      coalesce('🏆 Лучшие знатоки комнаты:' || E'\n' || top, 'Пока никто не набрал очков. Начнём? !quiz'), who);
    return null;
  end if;
  if txt ~ '^(help|помощь|бот|команды)( |$)' and new.body ~ '^\s*!' then
    perform private.bot_say(new.room_id, rb.fandom_bot,
      'Я бот этой комнаты 🤖 Спроси меня о фандоме (с вопросительным знаком или по имени), '
      || 'сыграй в викторину — !quiz, рейтинг — !score. Ответы с сюжетом прячу под спойлер — нажми, чтобы открыть.', who);
    return null;
  end if;

  -- 3. A question (or the fandom bot named): the best matching answer.
  if position('?' in new.body) > 0 or position(bot_name in txt) > 0 or position(bot_user in txt) > 0 then
    select answer, spoiler into faq from public.bot_faq f where f.room_id = new.room_id
      and not exists (select 1 from unnest(f.keywords) k where position(k in txt) = 0)
      order by cardinality(f.keywords) desc, random() limit 1;
    if found then
      perform private.bot_say(new.room_id, rb.fandom_bot,
        case when faq.spoiler then '⚠️ Спойлер! ||' || faq.answer || '||' else faq.answer end, who);
      return null;
    end if;
    if position(bot_name in txt) > 0 or position(bot_user in txt) > 0 then
      line := coalesce(private.bot_line(new.room_id, 'addressed'), 'Я тут! Напиши !help — расскажу, что умею.');
      perform private.bot_say(new.room_id, rb.fandom_bot, line, who);
      return null;
    end if;
  end if;

  -- 4. A visiting guest: answers when named, otherwise chats now and then.
  select v.bot_id, private.bot_norm(p.display_name) as name, p.username into guest
    from public.bot_visits v join public.profiles p on p.id = v.bot_id
    where v.room_id = new.room_id and v.until > clock_timestamp()
      and (position(private.bot_norm(p.display_name) in txt) > 0 or position(p.username in txt) > 0)
    limit 1;
  if found then
    perform private.bot_say(new.room_id, guest.bot_id, coalesce(private.bot_line(null, 'addressed'), 'Да-да?'), who);
    return null;
  end if;
  if rb.last_bot_at < clock_timestamp() - interval '40 seconds' and random() < 0.3 then
    select v.bot_id into guest from public.bot_visits v where v.room_id = new.room_id and v.until > clock_timestamp()
      order by random() limit 1;
    if found then
      perform private.bot_say(new.room_id, guest.bot_id,
        private.bot_line(null, case when random() < 0.5 then 'react' else 'smalltalk' end), who);
    elsif random() < 0.5 then
      line := private.bot_line(new.room_id, 'topic');
      if line is not null then perform private.bot_say(new.room_id, rb.fandom_bot, line, who); end if;
    end if;
  end if;
  return null;
end $$;
create trigger room_messages_bots after insert on public.room_messages
  for each row execute function private.bot_on_message();

revoke all on function private.bot_norm(text), private.bot_say(uuid, uuid, text, text), private.bot_line(uuid, text),
  private.bot_refresh_visits(uuid, integer), private.bot_on_member(), private.bot_on_message() from public;

-- The bots in a room right now (its fandom bot and visiting guests), for the
-- clients' member list and counts. Public rooms: anyone; others: members.
create function public.room_bots(p_room uuid)
returns table(id uuid, username text, display_name text, role text)
language sql stable security definer set search_path='' as $$
  select p.id, p.username, p.display_name, 'fandom'
    from public.room_bots b join public.profiles p on p.id = b.fandom_bot
    join public.rooms r on r.id = b.room_id
    where b.room_id = p_room and r.closed_at is null and (r.visibility = 'public' or private.is_member(r.id))
  union all
  select p.id, p.username, p.display_name, 'guest'
    from public.bot_visits v join public.profiles p on p.id = v.bot_id
    join public.rooms r on r.id = v.room_id
    where v.room_id = p_room and v.until > clock_timestamp() and r.closed_at is null
      and (r.visibility = 'public' or private.is_member(r.id))
$$;
revoke all on function public.room_bots(uuid) from public;
grant execute on function public.room_bots(uuid) to anon, authenticated;

-- Resident rooms stay: never marked inactive, never deleted.
create or replace function public.run_room_lifecycle()
returns table(inactive integer, deleted integer)
language plpgsql security definer set search_path='' as $$
declare marked integer; removed integer;
begin
  update public.rooms set inactive_at = clock_timestamp()
    where format = 'video' and not resident and inactive_at is null
      and last_occupied_at < clock_timestamp() - interval '10 minutes';
  get diagnostics marked = row_count;
  with gone as (
    delete from public.rooms
      where not resident
        and ((format = 'video' and last_occupied_at < clock_timestamp() - interval '30 minutes')
          or (format = 'music' and last_occupied_at < clock_timestamp() - interval '10 days'))
      returning id
  )
  insert into public.room_storage_cleanup(room_id) select id from gone
    on conflict (room_id) do nothing;
  get diagnostics removed = row_count;
  return query select marked, removed;
end $$;
revoke all on function public.run_room_lifecycle() from public, anon, authenticated;
grant execute on function public.run_room_lifecycle() to service_role;

notify pgrst, 'reload schema';
commit;
