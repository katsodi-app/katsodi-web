-- Fandom rooms in two languages (owner decision 2026-11-26): the 45 most
-- popular fandoms each have an English room, the top 25 also a Russian one.
-- Each room has one language (room_bots.lang) and its bots speak it: replies,
-- greetings, quiz and help. Quiz answers still count in either language.
-- Follows 2500 and 2600; then run supabase/seed/room_bots.sql.
begin;

alter table public.room_bots add column lang text not null default 'ru' check (lang in ('ru', 'en'));

create or replace function private.bot_on_member() returns trigger
language plpgsql security definer set search_path='' as $$
declare rb public.room_bots; who text; arrived uuid; v_lang text;
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
  v_lang := rb.lang; -- the room's language
  if rb.last_greet_at < clock_timestamp() - interval '20 seconds' then
    perform private.bot_say(new.room_id, rb.fandom_bot, private.bot_line(new.room_id, 'greet', v_lang), who, v_lang);
    update public.room_bots set last_greet_at = clock_timestamp() where room_id = new.room_id;
  end if;
  arrived := private.bot_refresh_visits(new.room_id, rb.tier);
  if arrived is not null then
    perform private.bot_say(new.room_id, arrived, private.bot_line(null, 'welcome', v_lang), who, v_lang);
  end if;
  return null;
end $$;
create or replace function private.bot_on_message() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  rb public.room_bots; who text; txt text; quiz record; faq record; guest record; arrived uuid;
  bot_name text; bot_user text; pts integer; top text; v_lang text; en boolean;
begin
  if new.kind <> 'text' then return null; end if;
  select * into rb from public.room_bots where room_id = new.room_id;
  if not found then return null; end if;
  if exists (select 1 from public.profiles where id = new.sender_id and is_bot) then return null; end if;
  select display_name into who from public.profiles where id = new.sender_id;
  select private.bot_norm(display_name), username into bot_name, bot_user from public.profiles where id = rb.fandom_bot;
  txt := private.bot_norm(new.body);
  v_lang := rb.lang; -- the room's language
  en := v_lang = 'en';
  arrived := private.bot_refresh_visits(new.room_id, rb.tier);

  -- 1. An answer to the open quiz question (answers count in either language).
  select s.quiz_id, z.question, z.answers into quiz from public.bot_quiz_state s join public.bot_quiz z on z.id = s.quiz_id
    where s.room_id = new.room_id and s.asked_at > clock_timestamp() - interval '10 minutes';
  if found and exists (select 1 from unnest(quiz.answers) a where private.bot_norm(a) <> ''
      and (' ' || txt || ' ') like ('% ' || private.bot_norm(a) || ' %')) then
    insert into public.bot_scores(room_id, user_id, points) values (new.room_id, new.sender_id, 1)
      on conflict (room_id, user_id) do update set points = public.bot_scores.points + 1 returning points into pts;
    delete from public.bot_quiz_state where room_id = new.room_id;
    perform private.bot_say(new.room_id, rb.fandom_bot,
      case when en then format('✅ {name}, correct! The answer: %s. Your points in this room: %s. Another one — !quiz', quiz.answers[1], pts)
           else format('✅ {name}, верно! Ответ: %s. Очков в этой комнате: %s. Ещё вопрос — !quiz', quiz.answers[1], pts) end,
      who, v_lang);
    return null;
  end if;

  -- 2. Commands (in either language; the reply in the person's).
  if txt ~ '^(quiz|квиз|викторина)( |$)' and new.body ~ '^\s*!' then
    select id, question into quiz from public.bot_quiz where room_id = new.room_id
      order by (bot_quiz.lang = v_lang) desc, random() limit 1;
    if found then
      insert into public.bot_quiz_state(room_id, quiz_id, asked_at) values (new.room_id, quiz.id, clock_timestamp())
        on conflict (room_id) do update set quiz_id = excluded.quiz_id, asked_at = excluded.asked_at;
      perform private.bot_say(new.room_id, rb.fandom_bot,
        '❓ ' || quiz.question || case when en then ' (answer in the chat, 10 minutes)' else ' (отвечайте в чат, 10 минут)' end, who, v_lang);
    end if;
    return null;
  end if;
  if txt ~ '^(score|счет|очки|рейтинг)( |$)' and new.body ~ '^\s*!' then
    select string_agg(format('%s. %s — %s', n, name, points), E'\n') into top from (
      select row_number() over (order by s.points desc) n, p.display_name name, s.points
        from public.bot_scores s join public.profiles p on p.id = s.user_id
        where s.room_id = new.room_id order by s.points desc limit 5) t;
    perform private.bot_say(new.room_id, rb.fandom_bot,
      case when en then coalesce('🏆 Best in this room:' || E'\n' || top, 'Nobody has points yet. Shall we start? !quiz')
           else coalesce('🏆 Лучшие знатоки комнаты:' || E'\n' || top, 'Пока никто не набрал очков. Начнём? !quiz') end, who, v_lang);
    return null;
  end if;
  if txt ~ '^(help|помощь|бот|команды|bot|commands)( |$)' and new.body ~ '^\s*!' then
    perform private.bot_say(new.room_id, rb.fandom_bot,
      case when en then 'I am this room''s bot 🤖 Ask me about the fandom (with a question mark or by my name), '
                     || 'play a quiz — !quiz, see the scores — !score. Plot answers come under a spoiler: click to open.'
           else 'Я бот этой комнаты 🤖 Спроси меня о фандоме (с вопросительным знаком или по имени), '
                || 'сыграй в викторину — !quiz, рейтинг — !score. Ответы с сюжетом прячу под спойлер — нажми, чтобы открыть.' end,
      who, v_lang);
    return null;
  end if;

  -- 3. A question (or the fandom bot named): the best matching answer.
  if position('?' in new.body) > 0 or position(bot_name in txt) > 0 or position(bot_user in txt) > 0 then
    select answer, spoiler into faq from public.bot_faq f where f.room_id = new.room_id and f.lang = v_lang
      and not exists (select 1 from unnest(f.keywords) k where position(k in txt) = 0)
      order by cardinality(f.keywords) desc, random() limit 1;
    if found then
      perform private.bot_say(new.room_id, rb.fandom_bot,
        case when faq.spoiler then (case when en then '⚠️ Spoiler! ||' else '⚠️ Спойлер! ||' end) || faq.answer || '||' else faq.answer end,
        who, v_lang);
      return null;
    end if;
    if position(bot_name in txt) > 0 or position(bot_user in txt) > 0 then
      perform private.bot_say(new.room_id, rb.fandom_bot,
        coalesce(private.bot_line(new.room_id, 'addressed', v_lang),
                 case when en then 'I am here! Type !help to see what I can do.' else 'Я тут! Напиши !help — расскажу, что умею.' end),
        who, v_lang);
      return null;
    end if;
  end if;

  -- 4. A visiting guest: answers when named, otherwise chats now and then.
  select v.bot_id into guest
    from public.bot_visits v join public.profiles p on p.id = v.bot_id
    where v.room_id = new.room_id and v.until > clock_timestamp()
      and (position(private.bot_norm(p.display_name) in txt) > 0 or position(p.username in txt) > 0)
    limit 1;
  if found then
    perform private.bot_say(new.room_id, guest.bot_id,
      coalesce(private.bot_line(null, 'addressed', v_lang), case when en then 'Yes?' else 'Да-да?' end), who, v_lang);
    return null;
  end if;
  if rb.last_bot_at < clock_timestamp() - interval '40 seconds' and random() < 0.3 then
    select v.bot_id into guest from public.bot_visits v where v.room_id = new.room_id and v.until > clock_timestamp()
      order by random() limit 1;
    if found then
      perform private.bot_say(new.room_id, guest.bot_id,
        private.bot_line(null, case when random() < 0.5 then 'react' else 'smalltalk' end, v_lang), who, v_lang);
    elsif random() < 0.5 then
      perform private.bot_say(new.room_id, rb.fandom_bot, private.bot_line(new.room_id, 'topic', v_lang), who, v_lang);
    end if;
  end if;
  return null;
end $$;
revoke all on function private.bot_on_member(), private.bot_on_message() from public;

notify pgrst, 'reload schema';
commit;
