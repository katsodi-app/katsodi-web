import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, beforeEach, expect, it } from "vitest";
let db: PGlite, room: string;
const owner = "10000000-0000-4000-8000-000000000001",
  member = "10000000-0000-4000-8000-000000000002";
const video = "https://www.youtube.com/watch?v=M7lc1UVf-VE";
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
const sent = async () => {
  await db.exec("reset role");
  return (
    await db.query<{
      topic: string;
      event: string;
      payload: object;
      private: boolean;
    }>("select topic, event, payload, private from realtime.sent order by n")
  ).rows;
};
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const file of [
    "20261101000100_foundation.sql",
    "20261102000500_room_player.sql",
    "20261104000900_room_playback.sql",
    "20261104001000_room_signals.sql",
    "20261105001600_room_site.sql",
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  for (const id of [owner, member])
    await db.query("insert into auth.users values($1,now())", [id]);
}, 120000);
afterAll(async () => {
  await db?.close();
});
it("never blocks a write when Realtime is unavailable", async () => {
  // No realtime schema exists yet: signalling must be skipped silently.
  await asUser(owner);
  room = (
    await db.query<{ id: string }>(
      "select public.create_room('Signals','','video','private',$1,'orbit') id",
      [video],
    )
  ).rows[0].id;
  await db.query("select public.send_room_message($1,'hello')", [room]);
  await db.exec("reset role");
  expect(
    (await db.query("select 1 from public.room_messages")).rows,
  ).toHaveLength(1);
});
beforeEach(async () => {
  if (!room) return;
  await db.exec("reset role");
  // Stand-in for Supabase's realtime.send(payload, event, topic, private).
  await db.exec(`create schema if not exists realtime;
    create table if not exists realtime.sent(n serial, topic text, event text, payload jsonb, private boolean);
    create or replace function realtime.send(payload jsonb, event text, topic text, private boolean) returns void
      language sql as $$ insert into realtime.sent(topic,event,payload,private) values(topic,event,payload,private) $$;
    truncate realtime.sent;`);
});
it("signals a room's topic on messages, members, playback and source changes", async () => {
  await asUser(owner);
  await new Promise((resolve) => setTimeout(resolve, 1100));
  await db.query("select public.send_room_message($1,'second')", [room]);
  await db.exec("reset role");
  await db.query(
    "insert into public.room_members(room_id,user_id,role) values($1,$2,'member')",
    [room, member],
  );
  await asUser(owner);
  await db.query("select public.set_room_playback($1,$2,'playing',4)", [
    room,
    video,
  ]);
  await db.query("select public.set_room_source($1,$2)", [
    room,
    "https://youtu.be/M7lc1UVf-VE",
  ]);
  const signals = await sent();
  expect(signals.length).toBeGreaterThanOrEqual(4);
  for (const signal of signals)
    expect(signal).toEqual({
      topic: `room:${room}`,
      event: "changed",
      payload: {},
      private: false,
    });
});
it("signals when hosts change the room website", async () => {
  await asUser(owner);
  await db.query("select public.set_room_site($1,$2)", [
    room,
    "https://example.org/",
  ]);
  expect(await sent()).toEqual([
    { topic: `room:${room}`, event: "changed", payload: {}, private: false },
  ]);
});
it("carries no message text, identity or playback state in the payload", async () => {
  await asUser(owner);
  await new Promise((resolve) => setTimeout(resolve, 1100));
  await db.query("select public.send_room_message($1,'a secret plan')", [room]);
  const raw = JSON.stringify(await sent());
  expect(raw).not.toContain("secret");
  expect(raw).not.toContain(owner);
});
it("is not callable by clients", async () => {
  await asUser(owner);
  await expect(
    db.query("select private.signal_room($1)", [room]),
  ).rejects.toThrow();
});
