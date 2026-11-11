import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, expect, it } from "vitest";
let db: PGlite, room: string;
const owner = "10000000-0000-4000-8000-000000000001",
  moderator = "10000000-0000-4000-8000-000000000002",
  member = "10000000-0000-4000-8000-000000000003",
  outsider = "10000000-0000-4000-8000-000000000004";
const first = "https://www.youtube.com/watch?v=M7lc1UVf-VE";
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const add = async (url: string) =>
  (
    await db.query<{ id: string }>("select public.add_room_queue($1,$2) id", [
      room,
      url,
    ])
  ).rows[0].id;
const queue = async () =>
  (
    await db.query<{ url: string }>(
      "select url from public.room_queue where room_id=$1 order by created_at, id",
      [room],
    )
  ).rows.map((r) => r.url);
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const file of [
    "20261101000100_foundation.sql",
    "20261102000500_room_player.sql",
    "20261104000900_room_playback.sql",
    "20261104001100_room_queue.sql",
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  for (const id of [owner, moderator, member, outsider])
    await db.query("insert into auth.users values($1,now())", [id]);
  await asUser(owner);
  room = (
    await db.query<{ id: string }>(
      "select public.create_room('Queue','','video','private',$1,'orbit') id",
      [first],
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
it("lets members add links in order and keeps outsiders out", async () => {
  await asUser(member);
  await add("https://vimeo.com/76979871");
  await wait(2100);
  await add("https://soundcloud.com/forss/flickermood");
  expect(await queue()).toEqual([
    "https://vimeo.com/76979871",
    "https://soundcloud.com/forss/flickermood",
  ]);
  await expect(add("https://vimeo.com/1")).rejects.toThrow("slow_down");
  await expect(add("javascript:alert(1)")).rejects.toThrow("invalid_source");
  await asUser(outsider);
  await expect(add("https://vimeo.com/2")).rejects.toThrow("forbidden");
  expect(await queue()).toEqual([]);
  await expect(
    db.query("insert into public.room_queue(room_id,url) values($1,$2)", [
      room,
      "https://vimeo.com/3",
    ]),
  ).rejects.toThrow();
});
it("lets only owners/moderators play an item, which becomes the source", async () => {
  await asUser(owner);
  await db.query("select public.set_room_playback($1,$2,'playing',90)", [
    room,
    first,
  ]);
  await asUser(member);
  await expect(
    db.query("select public.play_room_queue($1)", [room]),
  ).rejects.toThrow();
  await wait(2100);
  await asUser(moderator);
  await db.query("select public.play_room_queue($1)", [room]);
  await db.exec("reset role");
  expect(
    (
      await db.query<{ url: string }>(
        "select url from public.rooms where id=$1",
        [room],
      )
    ).rows[0].url,
  ).toBe("https://vimeo.com/76979871");
  await asUser(member);
  expect(await queue()).toEqual(["https://soundcloud.com/forss/flickermood"]);
  // The new source invalidates the old shared timeline.
  expect(
    (
      await db.query<{ p: unknown }>("select public.get_room_playback($1) p", [
        room,
      ])
    ).rows[0].p,
  ).toBeNull();
});
it("shares the source throttle and reports an empty queue", async () => {
  await asUser(owner);
  await expect(
    db.query("select public.play_room_queue($1)", [room]),
  ).rejects.toThrow("slow_down");
  await wait(2100);
  await db.query("select public.play_room_queue($1)", [room]);
  await expect(
    db.query("select public.play_room_queue($1)", [room]),
  ).rejects.toThrow("queue_empty");
});
it("lets the adder or a host remove an item, nobody else", async () => {
  await asUser(member);
  const mine = await add("https://vimeo.com/111");
  await asUser(moderator);
  await wait(2100);
  const theirs = await add("https://vimeo.com/222");
  await asUser(member);
  await expect(
    db.query("select public.remove_room_queue($1)", [theirs]),
  ).rejects.toThrow("forbidden");
  await db.query("select public.remove_room_queue($1)", [mine]);
  await asUser(owner);
  await db.query("select public.remove_room_queue($1)", [theirs]);
  expect(await queue()).toEqual([]);
});
it("caps a room at 50 queued links", async () => {
  await db.exec("reset role");
  await db.query(
    "insert into public.room_queue(room_id,url,added_by,created_at) select $1,'https://vimeo.com/'||g,$2,now()-interval '1 hour' from generate_series(1,50) g",
    [room, owner],
  );
  await asUser(member);
  await wait(2100);
  await expect(add("https://vimeo.com/51")).rejects.toThrow("queue_full");
});
