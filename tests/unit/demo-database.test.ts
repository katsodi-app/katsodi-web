import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, expect, it } from "vitest";
let db: PGlite, room: string;
const owner = "10000000-0000-4000-8000-000000000001",
  moderator = "10000000-0000-4000-8000-000000000002",
  member = "10000000-0000-4000-8000-000000000003",
  other = "10000000-0000-4000-8000-000000000004",
  outsider = "10000000-0000-4000-8000-000000000005";
const link = "https://example.org/demo";
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const call = (sql: string, ...args: unknown[]) =>
  db.query(`select ${sql}`, [room, ...args]);
const demo = async () => {
  await db.exec("reset role");
  return (
    (
      await db.query<{ user_id: string; status: string; paused_by: string }>(
        "select user_id, status, paused_by from public.room_demos where room_id=$1",
        [room],
      )
    ).rows[0] ?? null
  );
};
const age = (column: string, interval: string) =>
  db.query(
    `update public.room_demos set ${column}=now()-interval '${interval}' where room_id=$1`,
    [room],
  );
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const file of [
    "20261101000100_foundation.sql",
    "20261103000600_voice.sql",
    "20261105001700_room_screen.sql",
    "20261106001800_room_demo.sql",
    "20261106002100_demo_annotations.sql",
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  for (const id of [owner, moderator, member, other, outsider])
    await db.query("insert into auth.users values($1,now())", [id]);
  await asUser(owner);
  room = (
    await db.query<{ id: string }>(
      "select public.create_room('Demo','','video','private','','orbit') id",
    )
  ).rows[0].id;
  await db.exec("reset role");
  await db.query(
    "insert into public.room_members(room_id,user_id,role) values($1,$2,'moderator'),($1,$3,'member'),($1,$4,'member')",
    [room, moderator, member, other],
  );
}, 120000);
afterAll(async () => {
  await db?.close();
});
it("replaces the plain screen share of migration 1700", async () => {
  await db.exec("reset role");
  expect(
    (await db.query("select to_regclass('public.room_screens') t")).rows,
  ).toEqual([{ t: null }]);
});
it("posts a member's link to the chat and waits for a host", async () => {
  await asUser(member);
  expect(
    (await call("public.request_room_demo($1,$2) s", link)).rows[0],
  ).toEqual({ s: "pending" });
  await db.exec("reset role");
  const posted = await db.query<{ body: string }>(
    "select body from public.room_messages where room_id=$1 and sender_id=$2",
    [room, member],
  );
  expect(posted.rows.map((r) => r.body)).toEqual([link]);
  expect(await demo()).toMatchObject({ user_id: member, status: "pending" });
  // A waiting request cannot be confirmed into a live demo by its author.
  await asUser(member);
  expect((await call("public.beat_room_demo($1) s")).rows[0]).toEqual({
    s: "pending",
  });
  await expect(call("public.decide_room_demo($1,true)")).rejects.toThrow(
    "forbidden",
  );
  await expect(call("public.pause_room_demo($1,true)")).rejects.toThrow(
    "forbidden",
  );
});
it("allows one demo at a time and lets a host accept it", async () => {
  await asUser(other);
  await wait(1100);
  await expect(
    call("public.request_room_demo($1,$2)", "https://example.org/b"),
  ).rejects.toThrow("demo_busy");
  await asUser(moderator);
  await call("public.decide_room_demo($1,true)");
  expect(await demo()).toMatchObject({ user_id: member, status: "live" });
  await asUser(member);
  expect((await call("public.beat_room_demo($1) s")).rows[0]).toEqual({
    s: "live",
  });
}, 20000);
it("lets only hosts pause and resume, and the sharer or a host stop", async () => {
  await asUser(moderator);
  await call("public.pause_room_demo($1,true)");
  expect(await demo()).toMatchObject({
    status: "paused",
    paused_by: moderator,
  });
  await asUser(member);
  await expect(call("public.pause_room_demo($1,false)")).rejects.toThrow(
    "forbidden",
  );
  await asUser(owner);
  await call("public.pause_room_demo($1,false)");
  expect(await demo()).toMatchObject({ status: "live", paused_by: null });
  await asUser(other);
  await expect(call("public.stop_room_demo($1)")).rejects.toThrow("forbidden");
  await asUser(member);
  await call("public.stop_room_demo($1)");
  expect(await demo()).toBeNull();
});
it("starts a host's own demo at once and lets hosts decline requests", async () => {
  await asUser(owner);
  await wait(1100);
  expect(
    (await call("public.request_room_demo($1,$2) s", link)).rows[0],
  ).toEqual({ s: "live" });
  await call("public.stop_room_demo($1)");
  await asUser(other);
  await wait(1100);
  await call("public.request_room_demo($1,$2)", link);
  await asUser(owner);
  await call("public.decide_room_demo($1,false)");
  expect(await demo()).toBeNull();
}, 20000);
it("expires silent demos and stale requests", async () => {
  await asUser(member);
  await wait(1100);
  await call("public.request_room_demo($1,$2)", link);
  await db.exec("reset role");
  await age("requested_at", "11 minutes");
  await asUser(other);
  await wait(1100);
  // The stale request no longer blocks someone else.
  await call("public.request_room_demo($1,$2)", link);
  await asUser(owner);
  await call("public.decide_room_demo($1,true)");
  await db.exec("reset role");
  await age("seen_at", "2 minutes");
  await asUser(other);
  await expect(call("public.beat_room_demo($1)")).rejects.toThrow(
    "demo_unavailable",
  );
  await asUser(owner);
  await expect(call("public.pause_room_demo($1,true)")).rejects.toThrow(
    "demo_unavailable",
  );
}, 20000);
it("ends a demo when its sharer leaves and hides it from outsiders", async () => {
  await asUser(member);
  await wait(1100);
  await call("public.request_room_demo($1,$2)", link);
  await asUser(outsider);
  expect((await db.query("select 1 from public.room_demos")).rows).toHaveLength(
    0,
  );
  await expect(call("public.request_room_demo($1,$2)", link)).rejects.toThrow(
    "forbidden",
  );
  await db.exec("reset role");
  await db.query(
    "update public.room_members set status='left' where room_id=$1 and user_id=$2",
    [room, member],
  );
  expect(await demo()).toBeNull();
}, 20000);
it("lets only hosts open annotations to everyone, during a running demo", async () => {
  await asUser(owner);
  await wait(1100);
  await call("public.request_room_demo($1,$2)", link);
  await asUser(member);
  await expect(call("public.set_demo_annotations($1,true)")).rejects.toThrow(
    "forbidden",
  );
  await asUser(moderator);
  await call("public.set_demo_annotations($1,true)");
  await db.exec("reset role");
  expect(
    (
      await db.query<{ open: boolean }>(
        "select annotations_open open from public.room_demos where room_id=$1",
        [room],
      )
    ).rows[0],
  ).toEqual({ open: true });
  // A new demo starts closed again.
  await asUser(owner);
  await call("public.stop_room_demo($1)");
  await wait(1100);
  await call("public.request_room_demo($1,$2)", link);
  await db.exec("reset role");
  expect(
    (
      await db.query<{ open: boolean }>(
        "select annotations_open open from public.room_demos where room_id=$1",
        [room],
      )
    ).rows[0],
  ).toEqual({ open: false });
  await asUser(owner);
  await call("public.stop_room_demo($1)");
  await expect(call("public.set_demo_annotations($1,true)")).rejects.toThrow(
    "demo_unavailable",
  );
}, 20000);
it("removes a demoted host from the SFU", async () => {
  await db.exec("reset role");
  const before = (
    await db.query("select count(*)::int n from public.voice_revocations")
  ).rows[0] as { n: number };
  await db.query(
    "update public.room_members set role='member' where room_id=$1 and user_id=$2",
    [room, moderator],
  );
  const after = await db.query<{ user_id: string }>(
    "select user_id from public.voice_revocations order by id offset $1",
    [before.n],
  );
  expect(after.rows.map((r) => r.user_id)).toEqual([moderator]);
});
