// Generates supabase/seed/room_bots.sql: the fandom rooms, their bots and
// the guest bots (migrations 2500, 2600 and 2700 must be applied).
//   node supabase/seed/bots/index.mjs
//
// Which rooms exist: ./rooms-meta.mjs (the 45 most popular fandoms in
// English, the top 25 also in Russian). Content per fandom:
//   Russian: anime/cinema/games/more.mjs — fandom: catalogue id, bot:
//     [username, display name], tier: 1..3 (guest bots at once), room: [name,
//     description], greet/topics/addressed: lines ({name}, {room}),
//     faq: [[keywords], answer, spoiler?] — every keyword must appear in the
//     question (lower case, ё as е; stems match longer words),
//     quiz: [question, accepted answer, ...more accepted answers].
//   English: en-*.mjs, keyed by catalogue id, the same fields (quizzes in the
//     same order: accepted answers are merged, so either language counts).
//   Starting videos: ./videos.mjs (scripts/pick-room-videos.ts).
// Ids are derived from names (md5), so running the seed again updates in place:
// a Russian room keeps its id; a fandom's English room is "<fandom>:en" when the
// fandom also has a Russian room, otherwise the former Russian room's id (it
// became the English room, with the same bot account). Rooms of fandoms no
// longer listed are deleted with their bots.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import anime from "./anime.mjs";
import cinema from "./cinema.mjs";
import games from "./games.mjs";
import more from "./more.mjs";
import { guests, lines, linesEn } from "./guests.mjs";
import enAnime from "./en-anime.mjs";
import enCinema from "./en-cinema.mjs";
import enGames from "./en-games.mjs";
import enMore from "./en-more.mjs";
import roomsMeta from "./rooms-meta.mjs"; // not "meta": Vite confuses it with import.meta
import videos from "./videos.mjs";

export const content = [...cinema, ...anime, ...games, ...more];
export const english = { ...enAnime, ...enCinema, ...enGames, ...enMore };
export const BOTH = 25; // the top 25 fandoms have a Russian room too
const here = path.dirname(fileURLToPath(import.meta.url));
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const arr = (list) => "array[" + list.map(q).join(",") + "]::text[]";
const norm = (s) => String(s).toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const botId = (username) => `md5('katsodi-bot:' || ${q(username)})::uuid`;
const roomId = (key) => `md5('katsodi-room:' || ${q(key)})::uuid`;
const arts = ["orbit", "wave", "moon", "sun"];

/** Every room to exist: { key, lang, bot: [username, display], name, description, tier, url, lines }. */
export function plannedRooms() {
  const out = [];
  roomsMeta.forEach((entry, rank) => {
    const ru = content.find((r) => r.fandom === entry.fandom);
    const en = english[entry.fandom];
    const video = videos[entry.fandom] || {};
    if (rank < BOTH) {
      out.push({ key: entry.fandom, fandom: entry.fandom, lang: "ru", bot: ru.bot, name: ru.room[0], description: ru.room[1],
                 tier: ru.tier, url: (video.ru || video.en)?.url || "", lines: ru, other: en });
      out.push({ key: `${entry.fandom}:en`, fandom: entry.fandom, lang: "en", bot: entry.en.bot, name: entry.en.room[0],
                 description: entry.en.room[1], tier: ru.tier, url: video.en?.url || "", lines: en, other: ru });
    } else {
      out.push({ key: entry.fandom, fandom: entry.fandom, lang: "en", bot: [ru.bot[0], entry.en.bot[0]], name: entry.en.room[0],
                 description: entry.en.room[1], tier: ru.tier, url: video.en?.url || "", lines: en, other: ru });
    }
  });
  return out;
}
/** Fandoms whose rooms (and bots) go. */
export const removed = () => content.filter((r) => !roomsMeta.some((m) => m.fandom === r.fandom));

export function check() {
  const problems = [];
  const planned = plannedRooms();
  if (roomsMeta.length !== 45) problems.push(`expected 45 fandoms, got ${roomsMeta.length}`);
  if (planned.filter((r) => r.lang === "en").length !== 45) problems.push("expected 45 English rooms");
  if (planned.filter((r) => r.lang === "ru").length !== BOTH) problems.push(`expected ${BOTH} Russian rooms`);
  const users = new Set();
  for (const [username] of [...guests, ...planned.map((r) => r.bot)]) {
    if (!/^[a-z][a-z0-9_]{2,23}$/.test(username)) problems.push(`bad username ${username}`);
    if (users.has(username)) problems.push(`duplicate username ${username}`);
    users.add(username);
  }
  for (const entry of roomsMeta) {
    if (!content.some((r) => r.fandom === entry.fandom)) problems.push(`no content for ${entry.fandom}`);
    if (!english[entry.fandom]) problems.push(`no English for ${entry.fandom}`);
  }
  for (const room of planned) {
    const { name, description, lines: c, other } = room;
    if (name.length < 3 || name.length > 80) problems.push(`room name length ${name}`);
    if (description.length > 500) problems.push(`description ${name}`);
    if (!(room.tier >= 1 && room.tier <= 3)) problems.push(`tier ${name}`);
    if (!/^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(room.url)) problems.push(`no video for ${name}`);
    if (!c?.greet?.length || !c?.quiz?.length || !c?.faq?.length || !c?.topics?.length) problems.push(`content missing ${name}`);
    if (c && other && c.quiz.length !== other.quiz.length) problems.push(`quizzes of ${name} do not line up`);
    for (const [keywords, answer] of c?.faq || []) {
      if (!keywords.length || keywords.length > 6) problems.push(`keywords ${name}`);
      for (const k of keywords) if (norm(k) !== k.toLowerCase().replace(/ё/g, "е")) problems.push(`keyword "${k}" in ${name} is not normalised`);
      if (answer.length > 1500) problems.push(`answer ${name}`);
    }
    for (const [question, ...answers] of c?.quiz || []) if (!question || !answers.length) problems.push(`quiz ${name}`);
  }
  return problems;
}

export function sql() {
  const planned = plannedRooms();
  const out = [];
  out.push("-- Generated by supabase/seed/bots/index.mjs; do not edit by hand.");
  out.push("-- Needs migrations 2500, 2600 and 2700. Run in the Supabase SQL Editor.");
  out.push("begin;");
  // Rooms and bots no longer listed go first (their chats go with the rooms).
  const keep = planned.map((r) => roomId(r.key));
  out.push(`delete from public.rooms where resident and id not in (${keep.join(", ")});`);
  const gone = removed().map((r) => botId(r.bot[0]));
  if (gone.length) out.push(`delete from auth.users where id in (${gone.join(", ")});`);
  // Bot accounts: no password, an .invalid address; they never sign in.
  const bots = [...guests.map((g) => ({ bot: g, guest: true })), ...planned.map((r) => ({ bot: r.bot, room: r }))];
  out.push("insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,");
  out.push("  created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) values");
  out.push(bots.map(({ bot: [u] }) => `  ('00000000-0000-0000-0000-000000000000', ${botId(u)}, 'authenticated', 'authenticated', ${q(u + "@bots.katsodi.invalid")}, '', '{"provider":"bot","providers":["bot"]}', '{}', now(), now(), '', '', '', '')`).join(",\n"));
  out.push("on conflict (id) do nothing;");
  for (const { bot: [u, display], room } of bots) {
    const bio = !room
      ? "Бот-собеседник Katsodi 🤖 Заглядывает в комнаты фандомов, когда там есть люди. / A Katsodi chat bot: drops into fandom rooms when people are there."
      : room.lang === "ru"
        ? `Бот комнаты «${room.name}» 🤖 Отвечает на вопросы о фандоме, проводит викторины (!quiz) и прячет спойлеры.`
        : `The bot of the room "${room.name}" 🤖 Answers fandom questions, runs quizzes (!quiz) and hides spoilers.`;
    out.push(`update public.profiles set username = ${q(u)}, display_name = ${q(display)}, is_bot = true, onboarding_completed = true, bio = ${q(bio)} where id = ${botId(u)};`);
  }
  out.push(`insert into public.bot_guests(bot_id) values ${guests.map(([u]) => `(${botId(u)})`).join(", ")} on conflict do nothing;`);
  // Rooms, owned by their bot; resident: never cleaned up. The starting video
  // is set only where the room has none (a re-run leaves what plays alone).
  planned.forEach((room, i) => {
    out.push(`insert into public.rooms(id, owner_id, name, description, format, visibility, url, art, fandom_id, resident)
  values (${roomId(room.key)}, ${botId(room.bot[0])}, ${q(room.name)}, ${q(room.description)}, 'video', 'public', ${q(room.url)}, '${arts[i % 4]}', ${q(room.fandom)}, true)
  on conflict (id) do update set name = excluded.name, description = excluded.description, owner_id = excluded.owner_id,
    url = case when public.rooms.url = '' then excluded.url else public.rooms.url end, resident = true, closed_at = null;`);
    out.push(`insert into public.room_bots(room_id, fandom_bot, tier, lang) values (${roomId(room.key)}, ${botId(room.bot[0])}, ${room.tier}, '${room.lang}')
  on conflict (room_id) do update set fandom_bot = excluded.fandom_bot, tier = excluded.tier, lang = excluded.lang;`);
  });
  // Content is replaced as a whole on every run: each room in its language.
  out.push(`delete from public.bot_faq where room_id in (select room_id from public.room_bots);`);
  out.push(`delete from public.bot_quiz_state where room_id in (select room_id from public.room_bots);`);
  out.push(`delete from public.bot_quiz where room_id in (select room_id from public.room_bots);`);
  out.push(`delete from public.bot_lines;`);
  for (const room of planned) {
    const id = roomId(room.key), c = room.lines, other = room.other;
    for (const [keywords, answer, spoiler] of c.faq)
      out.push(`insert into public.bot_faq(room_id, lang, keywords, answer, spoiler) values (${id}, '${room.lang}', ${arr(keywords.map((k) => k.toLowerCase().replace(/ё/g, "е")))}, ${q(answer)}, ${spoiler ? "true" : "false"});`);
    c.quiz.forEach(([question, ...answers], i) => {
      // The other language's answers count too (shown: this language's first).
      const accepted = [...new Set([...answers, ...(other?.quiz[i]?.slice(1) || [])])].slice(0, 12);
      out.push(`insert into public.bot_quiz(room_id, lang, question, answers) values (${id}, '${room.lang}', ${q(question)}, ${arr(accepted)});`);
    });
    for (const kind of ["greet", "topic", "addressed"])
      for (const body of c[kind === "topic" ? "topics" : kind] || [])
        out.push(`insert into public.bot_lines(room_id, lang, kind, body) values (${id}, '${room.lang}', '${kind}', ${q(body)});`);
  }
  for (const [lang, set] of [["ru", lines], ["en", linesEn]])
    for (const [kind, list] of Object.entries(set))
      for (const body of list) out.push(`insert into public.bot_lines(room_id, lang, kind, body) values (null, '${lang}', '${kind}', ${q(body)});`);
  out.push("commit;");
  return out.join("\n") + "\n";
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = check();
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  const file = path.join(here, "..", "room_bots.sql");
  fs.writeFileSync(file, sql());
  const planned = plannedRooms();
  console.log(`${planned.length} rooms (${planned.filter((r) => r.lang === "en").length} English, ${planned.filter((r) => r.lang === "ru").length} Russian), ${planned.length + guests.length} bots, ${removed().length} fandoms removed -> ${path.relative(process.cwd(), file)}`);
}
