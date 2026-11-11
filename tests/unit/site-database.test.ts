import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, expect, it } from "vitest";
let db: PGlite, room: string;
const owner = "10000000-0000-4000-8000-000000000001",
  moderator = "10000000-0000-4000-8000-000000000002",
  member = "10000000-0000-4000-8000-000000000003",
  outsider = "10000000-0000-4000-8000-000000000004";
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const set = (url: string) =>
  db.query("select public.set_room_site($1,$2)", [room, url]);
const site = async () =>
  (
    await db.query<{ url: string }>(
      "select url from public.room_sites where room_id=$1",
      [room],
    )
  ).rows[0]?.url ?? null;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const file of [
    "20261101000100_foundation.sql",
    "20261105001600_room_site.sql",
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  for (const id of [owner, moderator, member, outsider])
    await db.query("insert into auth.users values($1,now())", [id]);
  await asUser(owner);
  room = (
    await db.query<{ id: string }>(
      "select public.create_room('Site','','video','private','','orbit') id",
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
it("lets hosts set, replace and clear the room's website", async () => {
  await asUser(owner);
  await set("https://example.org/");
  await asUser(member);
  expect(await site()).toBe("https://example.org/");
  await asUser(moderator);
  await expect(set("https://example.net/")).rejects.toThrow("slow_down");
  await wait(2100);
  await set("https://example.net/");
  expect(await site()).toBe("https://example.net/");
  await wait(2100);
  await set("");
  expect(await site()).toBeNull();
}, 20000);
it("keeps members and outsiders from changing or reading it", async () => {
  await asUser(owner);
  await set("https://example.org/a");
  await asUser(member);
  await expect(set("https://example.org/b")).rejects.toThrow("forbidden");
  await asUser(outsider);
  await expect(set("https://example.org/c")).rejects.toThrow("forbidden");
  expect(await site()).toBeNull();
  await expect(
    db.query("insert into public.room_sites(room_id,url) values($1,$2)", [
      room,
      "https://example.org/d",
    ]),
  ).rejects.toThrow();
  await asUser(owner);
  await wait(2100);
  for (const bad of [
    "javascript:alert(1)",
    "http://example.org/",
    "https://a b",
  ])
    await expect(set(bad)).rejects.toThrow("invalid_source");
}, 20000);
