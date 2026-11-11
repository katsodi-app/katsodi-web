import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite, room: string;
const owner = "10000000-0000-4000-8000-000000000001",
  moderator = "10000000-0000-4000-8000-000000000002",
  member = "10000000-0000-4000-8000-000000000003",
  outsider = "10000000-0000-4000-8000-000000000004";
const video = "https://www.youtube.com/watch?v=M7lc1UVf-VE";
type Playback = {
  state: string;
  position: number;
  updated_at: string;
  source_url: string;
};
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
const read = async () =>
  (
    await db.query<{ p: Playback | null }>(
      "select public.get_room_playback($1) p",
      [room],
    )
  ).rows[0].p;
const publish = (state: string, position: number, source = video) =>
  db.query("select public.set_room_playback($1,$2,$3,$4) p", [
    room,
    source,
    state,
    position,
  ]);
// Let the 200 ms per-room rate limit pass between deliberate writes.
const settle = () => new Promise((resolve) => setTimeout(resolve, 230));
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const file of [
    "20261101000100_foundation.sql",
    "20261102000500_room_player.sql",
    "20261104000900_room_playback.sql",
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  for (const id of [owner, moderator, member, outsider])
    await db.query("insert into auth.users values($1,now())", [id]);
  await asUser(owner);
  room = (
    await db.query<{ id: string }>(
      "select public.create_room('Sync test','','video','private',$1,'orbit') id",
      [video],
    )
  ).rows[0].id;
  await db.exec("reset role");
  await db.query(
    "insert into public.room_members(room_id,user_id,role) values($1,$2,'moderator'),($1,$3,'member')",
    [room, moderator, member],
  );
}, 120000);
afterAll(async () => {
  await db?.close();
});
it("lets owners and moderators publish and every active member read the timeline", async () => {
  await asUser(member);
  expect(await read()).toBeNull();
  await expect(publish("playing", 10)).rejects.toThrow("forbidden");
  await asUser(owner);
  await publish("paused", 42.5);
  await asUser(member);
  expect(await read()).toMatchObject({
    state: "paused",
    position: 42.5,
    source_url: video,
  });
  await settle();
  await asUser(moderator);
  await publish("playing", 60);
  await asUser(member);
  expect((await read())?.state).toBe("playing");
});
it("extrapolates a playing position with the database clock", async () => {
  await settle();
  await asUser(owner);
  await publish("playing", 100);
  await new Promise((resolve) => setTimeout(resolve, 400));
  await asUser(member);
  const position = (await read())!.position;
  expect(position).toBeGreaterThan(100.3);
  expect(position).toBeLessThan(102);
});
it("hides the timeline from outsiders and denies direct table access", async () => {
  await asUser(outsider);
  await expect(read()).rejects.toThrow("forbidden");
  await expect(publish("paused", 1)).rejects.toThrow("forbidden");
  await asUser(member);
  await expect(
    db.query("select * from public.room_playback"),
  ).rejects.toThrow();
  await expect(
    db.query("update public.room_playback set position=0"),
  ).rejects.toThrow();
});
it("rejects stale sources, invalid values and bursts", async () => {
  await settle();
  await asUser(owner);
  await expect(
    publish("playing", 5, "https://www.youtube.com/watch?v=other"),
  ).rejects.toThrow("stale_source");
  for (const [state, position] of [
    ["rewind", 5],
    ["playing", -1],
    ["playing", Number.NaN],
    ["playing", Number.POSITIVE_INFINITY],
    ["playing", 172801],
  ] as const)
    await expect(
      publish(state, position),
      `${state} ${position}`,
    ).rejects.toThrow("invalid_playback");
  await publish("paused", 7);
  await expect(publish("playing", 7)).rejects.toThrow("slow_down");
});
it("drops the timeline when the source changes, the member is kicked or the room closes", async () => {
  await asUser(owner);
  await db.query("select public.set_room_source($1,$2)", [
    room,
    "https://www.youtube.com/watch?v=new-video1",
  ]);
  await asUser(member);
  expect(await read()).toBeNull();
  await settle();
  await asUser(owner);
  await db.query("select public.set_room_playback($1,$2,'playing',3)", [
    room,
    "https://www.youtube.com/watch?v=new-video1",
  ]);
  await db.query("select public.moderate_room($1,$2,'kick')", [room, member]);
  await asUser(member);
  await expect(read()).rejects.toThrow("forbidden");
  await asUser(owner);
  await db.query("select public.moderate_room($1,$2,'close')", [room, owner]);
  await asUser(moderator);
  expect(await read()).toBeNull();
  await expect(
    db.query("select public.set_room_playback($1,$2,'paused',3)", [
      room,
      "https://www.youtube.com/watch?v=new-video1",
    ]),
  ).rejects.toThrow("forbidden");
});
