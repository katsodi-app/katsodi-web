import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, beforeEach, expect, it } from "vitest";
let db: PGlite, room: string;
const owner = "10000000-0000-4000-8000-000000000001",
  moderator = "10000000-0000-4000-8000-000000000002",
  member = "10000000-0000-4000-8000-000000000003",
  other = "10000000-0000-4000-8000-000000000004",
  outsider = "10000000-0000-4000-8000-000000000005";
const embed = "https://abc123.hyperbeam.com/SESSION?token=secret";
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
const view = async () =>
  (
    await db.query<{
      b: { embed_url: string; current_url: string | null } | null;
    }>("select public.get_room_browser($1) b", [room])
  ).rows[0].b;
const start = (session = "session-1") =>
  db.query<{ previous: string | null }>(
    "select public.set_room_browser($1,$2,$3) previous",
    [room, session, embed],
  );
const claim = async () =>
  (
    await db.query<{ s: string | null }>(
      "select public.claim_room_browser_revocation($1) s",
      [room],
    )
  ).rows[0].s;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const file of [
    "20261101000100_foundation.sql",
    "20261104001200_room_browser.sql",
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  for (const id of [owner, moderator, member, other, outsider])
    await db.query("insert into auth.users values($1,now())", [id]);
  await asUser(owner);
  room = (
    await db.query<{ id: string }>(
      "select public.create_room('Browser','','video','private','','orbit') id",
    )
  ).rows[0].id;
}, 120000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.exec("reset role");
  await db.query("delete from public.room_browser");
  await db.query(
    "delete from public.room_members where room_id=$1 and role<>'owner'",
    [room],
  );
  await db.query(
    "insert into public.room_members(room_id,user_id,role) values($1,$2,'moderator'),($1,$3,'member'),($1,$4,'member')",
    [room, moderator, member, other],
  );
});
it("lets only hosts start and end a session, and members watch it", async () => {
  await asUser(member);
  expect(
    (
      await db.query<{ ok: boolean }>(
        "select public.can_host_room_browser($1) ok",
        [room],
      )
    ).rows[0].ok,
  ).toBe(false);
  await expect(start()).rejects.toThrow("forbidden");
  await asUser(moderator);
  expect((await start()).rows[0].previous).toBeNull();
  // Restarting returns the previous session so the server can delete it.
  expect((await start("session-2")).rows[0].previous).toBe("session-1");
  await asUser(member);
  expect(await view()).toMatchObject({ embed_url: embed, current_url: null });
  await expect(
    db.query("select public.end_room_browser($1)", [room]),
  ).rejects.toThrow("forbidden");
  await asUser(owner);
  expect(
    (
      await db.query<{ s: string }>("select public.end_room_browser($1) s", [
        room,
      ])
    ).rows[0].s,
  ).toBe("session-2");
  await asUser(member);
  expect(await view()).toBeNull();
});
it("keeps the embed URL from outsiders and direct table access", async () => {
  await asUser(owner);
  await start();
  await asUser(outsider);
  await expect(view()).rejects.toThrow("forbidden");
  await asUser(member);
  await expect(db.query("select * from public.room_browser")).rejects.toThrow();
});
it("shares the host's address with members, throttled, hosts only", async () => {
  await asUser(owner);
  await start();
  await db.query(
    "select public.set_room_browser_url($1,'https://example.org/a')",
    [room],
  );
  // A second update within one second is ignored.
  await db.query(
    "select public.set_room_browser_url($1,'https://example.org/b')",
    [room],
  );
  await asUser(member);
  expect((await view())?.current_url).toBe("https://example.org/a");
  await expect(
    db.query("select public.set_room_browser_url($1,'https://example.org/c')", [
      room,
    ]),
  ).rejects.toThrow("forbidden");
  await asUser(owner);
  await expect(
    db.query("select public.set_room_browser_url($1,'javascript:alert(1)')", [
      room,
    ]),
  ).rejects.toThrow("invalid_url");
});
it("revokes on a kick and lets a remaining member claim it exactly once", async () => {
  await asUser(owner);
  await start();
  await db.query("select public.moderate_room($1,$2,'kick')", [room, member]);
  await asUser(member);
  await expect(view()).rejects.toThrow("forbidden");
  expect(await claim()).toBeNull();
  await asUser(other);
  expect(await view()).toBeNull();
  expect(await claim()).toBe("session-1");
  expect(await claim()).toBeNull();
});
it("revokes when a host is demoted or leaves, but not when a member leaves", async () => {
  await asUser(owner);
  await start();
  await asUser(member);
  await db.query("select public.moderate_room($1,$2,'leave')", [room, member]);
  await asUser(other);
  expect(await view()).not.toBeNull();
  await asUser(moderator);
  await db.query("select public.moderate_room($1,$2,'leave')", [
    room,
    moderator,
  ]);
  await asUser(other);
  expect(await view()).toBeNull();
  expect(await claim()).toBe("session-1");
  await db.exec("reset role");
  await db.query(
    "update public.room_members set status='active' where room_id=$1 and user_id=$2",
    [room, moderator],
  );
  await db.query(
    "update public.room_members set role='moderator' where room_id=$1 and user_id=$2",
    [room, moderator],
  );
  await asUser(owner);
  await start("session-2");
  await db.query("select public.moderate_room($1,$2,'demote')", [
    room,
    moderator,
  ]);
  await asUser(other);
  expect(await claim()).toBe("session-2");
});
it("revokes when the room closes", async () => {
  await asUser(owner);
  await start();
  await db.query("select public.moderate_room($1,$2,'close')", [room, owner]);
  await asUser(other);
  expect(await view()).toBeNull();
  expect(await claim()).toBe("session-1");
});
