import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql as seedSql } from "../../supabase/seed/bots/index.mjs";

// Migrations 2500 (fandom rooms with bots) and 2600 (languages) and the seed, on PGlite.
let db: PGlite;
const alice = "20000000-0000-4000-8000-000000000001",
  bob = "20000000-0000-4000-8000-000000000002";
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
async function roomOf(fandom: string) {
  await db.exec("reset role");
  return (
    await db.query<{ id: string }>(
      "select id from public.rooms where fandom_id=$1 and resident",
      [fandom],
    )
  ).rows[0].id;
}
// What was said in a room, oldest first, with whether a bot said it.
async function chat(room: string) {
  await db.exec("reset role");
  return (
    await db.query<{ body: string; bot: boolean; name: string }>(
      `select m.body, p.is_bot bot, p.display_name name from public.room_messages m
         join public.profiles p on p.id = m.sender_id where m.room_id = $1 order by m.created_at, m.id`,
      [room],
    )
  ).rows;
}
async function say(user: string, room: string, body: string) {
  await db.exec("reset role");
  // As the room's send path does: a row from that person.
  await db.query(
    "insert into public.room_messages(room_id, sender_id, body) values ($1,$2,$3)",
    [room, user, body],
  );
  // Replies are not throttled in tests: each step starts fresh.
  await db.query(
    "update public.room_bots set last_bot_at='-infinity', last_greet_at='-infinity' where room_id=$1",
    [room],
  );
  return (await chat(room)).at(-1)!;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;
     create table auth.users(instance_id uuid, id uuid primary key, aud text, role text, email text, encrypted_password text,
       raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz,
       confirmation_token text, recovery_token text, email_change_token_new text, email_change text, email_confirmed_at timestamptz);
     create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
     grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const file of [
    "20261101000100_foundation.sql",
    "20261101000200_fandom_seed.sql",
    "20261102000400_room_fandom.sql",
    "20261102000500_room_player.sql",
    "20261103000600_voice.sql",
    "20261104000700_rejoin_role_reset.sql",
    "20261104000900_room_playback.sql",
    "20261104001100_room_queue.sql",
    "20261106002000_room_lifecycle.sql",
    "20261108002200_music_rooms.sql",
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  // Chat kinds (migration 300 needs Storage): the column the bots check.
  await db.exec("alter table public.room_messages add column kind text not null default 'text'");
  await db.exec(readFileSync("supabase/migrations/20261125002500_room_bots.sql", "utf8"));
  // Languages came as a second migration (2500 was already applied).
  await db.exec(readFileSync("supabase/migrations/20261125002600_room_bots_languages.sql", "utf8"));
  await db.exec("grant usage on schema public to service_role");
  for (const id of [alice, bob])
    await db.query("insert into auth.users(id, email_confirmed_at) values($1,now())", [id]);
  await db.query("update public.profiles set display_name='Алиса' where id=$1", [alice]);
  await db.query("update public.profiles set display_name='Боб' where id=$1", [bob]);
  await db.exec(seedSql());
}, 180000);
afterAll(async () => {
  await db?.close();
});

describe("fandom rooms with bots", () => {
  it("seeds 70 resident public rooms, each with its fandom bot", async () => {
    const rooms = await db.query<{ n: number }>(
      "select count(*)::int n from public.rooms r join public.room_bots b on b.room_id=r.id where r.resident and r.visibility='public'",
    );
    expect(rooms.rows[0].n).toBe(70);
    const bots = await db.query<{ n: number }>("select count(*)::int n from public.profiles where is_bot");
    expect(bots.rows[0].n).toBe(82);
    // Running the seed again changes nothing in the counts.
    await db.exec(seedSql());
    expect((await db.query<{ n: number }>("select count(*)::int n from public.profiles where is_bot")).rows[0].n).toBe(82);
  });

  it("greets a newcomer, makes the first person the host, the next a member", async () => {
    const room = await roomOf("anime-1");
    await asUser(alice);
    await db.query("select public.join_room($1)", [room]);
    await asUser(bob);
    await db.query("select public.join_room($1)", [room]);
    await db.exec("reset role");
    const roles = await db.query<{ user_id: string; role: string }>(
      "select user_id, role from public.room_members where room_id=$1 order by joined_at",
      [room],
    );
    expect(roles.rows.find((r) => r.user_id === alice)?.role).toBe("moderator");
    expect(roles.rows.find((r) => r.user_id === bob)?.role).toBe("member");
    const first = (await chat(room))[0];
    expect(first.bot).toBe(true);
    expect(first.body).toContain("Алиса");
  });

  it("answers frequently asked questions and hides spoilers", async () => {
    const room = await roomOf("anime-1");
    const plain = await say(alice, room, "Сколько серий в Наруто?");
    expect(plain.bot).toBe(true);
    expect(plain.body).toContain("220");
    const spoiler = await say(bob, room, "а кто отец Наруто?");
    expect(spoiler.body).toMatch(/^⚠️ Спойлер! \|\|[\s\S]*Минато[\s\S]*\|\|$/);
    // No question mark and no name: the fandom bot keeps quiet (and small
    // talk waits 40 s after a bot's last message).
    const before = (await chat(room)).length;
    await db.query("update public.room_bots set last_bot_at = now() + interval '1 hour' where room_id=$1", [room]);
    await say(alice, room, "сколько серий");
    expect((await chat(room)).length).toBe(before + 1);
  });

  it("answers in English when asked in English, and greets in the person's language", async () => {
    const room = await roomOf("anime-1");
    const plain = await say(bob, room, "How many episodes does Naruto have?");
    expect(plain.bot).toBe(true);
    expect(plain.body).toContain("220 episodes");
    const spoiler = await say(bob, room, "who is Naruto's father?");
    expect(spoiler.body).toMatch(/^⚠️ Spoiler! \|\|[\s\S]*Minato[\s\S]*\|\|$/);
    // Commands answer in the person's language (Bob wrote English last).
    const help = await say(bob, room, "!help");
    expect(help.body).toMatch(/^I am this room's bot/);
    // Bob comes into another room: greeted in English.
    const other = await roomOf("cinema-0");
    await asUser(bob);
    await db.query("select public.join_room($1)", [other]);
    const greeting = (await chat(other)).find((m) => m.name === "Голокрон");
    // His name stays as he wrote it; the words around it are English.
    expect(greeting?.body).toContain("Боб");
    expect(greeting?.body.replace("Боб", "")).not.toMatch(/[А-Яа-яЁё]/);
    // An English quiz question takes a Russian answer as well.
    const question = await say(bob, other, "!quiz");
    expect(question.body).toMatch(/^❓ .*\(answer in the chat, 10 minutes\)$/);
    await db.exec("reset role");
    const answers = (
      await db.query<{ answers: string[] }>(
        "select z.answers from public.bot_quiz_state s join public.bot_quiz z on z.id=s.quiz_id where s.room_id=$1",
        [other],
      )
    ).rows[0].answers;
    const russian = answers.find((a) => /[А-Яа-яЁё]/.test(a)) ?? answers[0];
    const right = await say(alice, other, russian);
    expect(right.body).toMatch(/^✅ Алиса, верно!/);
  });

  it("runs a quiz with scores", async () => {
    const room = await roomOf("cinema-5");
    await asUser(alice);
    await db.query("select public.join_room($1)", [room]);
    const question = await say(alice, room, "!quiz");
    expect(question.body).toMatch(/^❓ /);
    await db.exec("reset role");
    const answer = (
      await db.query<{ answers: string[] }>(
        "select z.answers from public.bot_quiz_state s join public.bot_quiz z on z.id=s.quiz_id where s.room_id=$1",
        [room],
      )
    ).rows[0].answers[0];
    const right = await say(bob, room, `Я думаю, ${answer}!`);
    expect(right.body).toMatch(/^✅ Боб, верно!/);
    const score = await say(alice, room, "!score");
    expect(score.body).toContain("Боб — 1");
  });

  it("lists the room's bots for the clients, guests only while people are there", async () => {
    const room = await roomOf("anime-1");
    await db.exec("reset role");
    await db.query("update public.bot_visits set until = now() + interval '5 minutes' where room_id=$1", [room]);
    await db.query(
      "insert into public.bot_visits(room_id, bot_id, until) select $1, bot_id, now() + interval '5 minutes' from public.bot_guests limit 1 on conflict do nothing",
      [room],
    );
    await db.exec("set role anon");
    const bots = await db.query<{ role: string }>("select role from public.room_bots($1)", [room]);
    expect(bots.rows.map((b) => b.role)).toContain("fandom");
    expect(bots.rows.map((b) => b.role)).toContain("guest");
    // Anyone may read a bot's profile (it says it is a bot).
    const profile = await db.query<{ bio: string }>("select bio from public.profiles where is_bot limit 1");
    expect(profile.rows[0].bio).toMatch(/бот/i);
    await db.exec("reset role");
    await db.query("update public.bot_visits set until = now() - interval '1 minute' where room_id=$1", [room]);
    await db.exec("set role anon");
    const later = await db.query<{ role: string }>("select role from public.room_bots($1)", [room]);
    expect(later.rows.map((b) => b.role)).toEqual(["fandom"]);
  });

  it("keeps resident rooms through the room lifecycle", async () => {
    await db.exec("reset role");
    await db.exec("update public.rooms set last_occupied_at = now() - interval '30 days' where resident");
    await db.exec("select public.run_room_lifecycle()");
    const left = await db.query<{ n: number }>("select count(*)::int n from public.rooms where resident and inactive_at is null");
    expect(left.rows[0].n).toBe(70);
  });

  it("never lets a person mark themselves as a bot", async () => {
    await asUser(alice);
    await expect(db.query("update public.profiles set is_bot = true where id = $1", [alice])).rejects.toThrow(/permission denied/);
  });
});
