import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, expect, it } from "vitest";
let db: PGlite;
const ana = "10000000-0000-4000-8000-000000000001",
  ben = "10000000-0000-4000-8000-000000000002",
  cy = "10000000-0000-4000-8000-000000000003";
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
const xp = async (id: string) => {
  await db.exec("reset role");
  return (
    await db.query<{ xp_total: number }>(
      "select xp_total from public.profiles where id=$1",
      [id],
    )
  ).rows[0].xp_total;
};
const events = async (id: string, kind: string) => {
  await db.exec("reset role");
  return (
    await db.query(
      "select * from public.xp_events where user_id=$1 and kind=$2",
      [id, kind],
    )
  ).rows.length;
};
type Progress = {
  xp: number;
  level: number;
  into_level: number;
  next_level: number;
  achievements: { id: string; unlocked_at: string | null }[];
};
const progress = async (id: string) =>
  (
    await db.query<{ p: Progress | null }>(
      "select public.profile_progress($1) p",
      [id],
    )
  ).rows[0].p;
const room = async (name: string, visibility = "public", format = "video") =>
  (
    await db.query<{ id: string }>(
      "select public.create_room($1,'',$3,$2,'','orbit') id",
      [name, visibility, format],
    )
  ).rows[0].id;
// Moves a user's last heartbeat back so the next ping counts a minute.
const age = async (user: string, roomId: string) => {
  await db.exec("reset role");
  await db.query(
    "update public.room_presence set last_ping = clock_timestamp() - interval '61 seconds' where user_id=$1 and room_id=$2",
    [user, roomId],
  );
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
    "20261104001400_friends.sql",
    "20261104001500_progression.sql",
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  for (const id of [ana, ben, cy])
    await db.query("insert into auth.users values($1,now())", [id]);
}, 120000);
afterAll(async () => {
  await db?.close();
});
it("computes levels with the 100 × level^1.5 curve", async () => {
  const at = async (total: number) =>
    (
      await db.query<{ level: number; into_level: number; next_level: number }>(
        "select * from public.level_progress($1)",
        [total],
      )
    ).rows[0];
  expect(await at(0)).toEqual({ level: 1, into_level: 0, next_level: 100 });
  expect(await at(99)).toMatchObject({ level: 1, into_level: 99 });
  // Level 2 needs round(100 × 2^1.5) = 283 more.
  expect(await at(100)).toEqual({ level: 2, into_level: 0, next_level: 283 });
  expect(await at(383)).toMatchObject({ level: 3, into_level: 0 });
});
it("pays the daily login once per day", async () => {
  await asUser(ana);
  expect(
    (await db.query<{ ok: boolean }>("select public.claim_daily_xp() ok"))
      .rows[0].ok,
  ).toBe(true);
  expect(
    (await db.query<{ ok: boolean }>("select public.claim_daily_xp() ok"))
      .rows[0].ok,
  ).toBe(false);
  expect(await xp(ana)).toBe(10);
});
it("pays room creation within the daily cap and joining once per room", async () => {
  await asUser(ana);
  const rooms = [];
  for (let n = 0; n < 4; n++) rooms.push(await room(`Room ${n}`));
  // Four rooms, but at most three creation rewards per day.
  expect(await events(ana, "room_create")).toBe(3);
  await asUser(ben);
  await db.query("select public.join_room($1)", [rooms[0]]);
  await db.query("select public.moderate_room($1,$2,'leave')", [rooms[0], ben]);
  await db.query("select public.join_room($1)", [rooms[0]]);
  // Leaving and rejoining the same room pays nothing new.
  expect(await events(ben, "room_join")).toBe(1);
  await asUser(ben);
  expect(
    (await progress(ben))?.achievements.find((a) => a.id === "first_steps")
      ?.unlocked_at,
  ).toBeTruthy();
});
it("pays a friendship once per pair, to both people", async () => {
  await db.exec("reset role");
  const pair = () =>
    db.query(
      "insert into public.friendships(user_a,user_b) values (least($1::uuid,$2::uuid),greatest($1::uuid,$2::uuid))",
      [ana, cy],
    );
  await pair();
  expect(await events(ana, "friend_add")).toBe(1);
  expect(await events(cy, "friend_add")).toBe(1);
  await db.exec("reset role");
  await db.query("delete from public.friendships");
  await pair();
  expect(await events(ana, "friend_add")).toBe(1);
});
it("counts presence at most once per 50 s and pays 15 active minutes once", async () => {
  await asUser(cy);
  const roomId = await room("Cy's room", "public");
  await asUser(cy);
  await db.query("select public.room_presence_ping($1)", [roomId]);
  await db.query("select public.room_presence_ping($1)", [roomId]);
  await db.exec("reset role");
  expect(
    (
      await db.query<{ minutes: number }>(
        "select minutes from public.room_presence where user_id=$1",
        [cy],
      )
    ).rows[0].minutes,
  ).toBe(1);
  for (let n = 0; n < 16; n++) {
    await age(cy, roomId);
    await asUser(cy);
    await db.query("select public.room_presence_ping($1)", [roomId]);
  }
  expect(await events(cy, "room_participation")).toBe(1);
  // Watching needs shared playback AND another present member: neither here.
  expect(await events(cy, "watch_together")).toBe(0);
});
it("pays watching together only while playback plays with someone else present", async () => {
  await asUser(ana);
  const video = "https://www.youtube.com/watch?v=M7lc1UVf-VE";
  const roomId = (
    await db.query<{ id: string }>(
      "select public.create_room('Movie night','','video','public',$1,'orbit') id",
      [video],
    )
  ).rows[0].id;
  await asUser(ben);
  await db.query("select public.join_room($1)", [roomId]);
  await asUser(ana);
  await db.query("select public.set_room_playback($1,$2,'playing',0)", [
    roomId,
    video,
  ]);
  for (let n = 0; n < 31; n++) {
    await age(ben, roomId);
    await asUser(ben);
    await db.query("select public.room_presence_ping($1)", [roomId]);
    await age(ana, roomId);
    await asUser(ana);
    await db.query("select public.room_presence_ping($1)", [roomId]);
  }
  expect(await events(ana, "watch_together")).toBe(1);
  expect(await events(ben, "watch_together")).toBe(1);
}, 20000);
it("ignores outsiders and closed rooms, and keeps the ledger private", async () => {
  await asUser(ana);
  const privateRoom = await room("Secret", "private");
  await asUser(cy);
  await db.query("select public.room_presence_ping($1)", [privateRoom]);
  await db.exec("reset role");
  expect(
    (
      await db.query("select * from public.room_presence where room_id=$1", [
        privateRoom,
      ])
    ).rows,
  ).toEqual([]);
  await asUser(ana);
  await expect(db.query("select * from public.xp_events")).rejects.toThrow();
  await expect(
    db.query("update public.profiles set xp_total = 999999 where id=$1", [ana]),
  ).rejects.toThrow();
  await expect(
    db.query("select private.award($1,'daily_login','x')", [ana]),
  ).rejects.toThrow();
});
it("shows progress to people who may see the profile; others see unlocked only", async () => {
  await asUser(ben);
  const own = await progress(ben);
  expect(own?.level).toBeGreaterThanOrEqual(1);
  // Your own view lists locked achievements too.
  expect(own?.achievements.length).toBe(7);
  await asUser(cy);
  // Cy shares no room or friendship with Ben.
  expect(await progress(ben)).toBeNull();
  await asUser(ana);
  // Ana and Ben share a room: Ana sees only Ben's unlocked achievements.
  const seen = await progress(ben);
  expect(seen?.achievements.every((a) => a.unlocked_at)).toBe(true);
});
