import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";

const owner = "10000000-0000-4000-8000-000000000001",
  member = "10000000-0000-4000-8000-000000000002",
  other = "10000000-0000-4000-8000-000000000003";
const bootstrap = `create role anon;create role authenticated;create role service_role;create schema auth;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz not null default now());
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`;
const migrations = [
  "20261101000100_foundation.sql",
  "20261101000200_fandom_seed.sql",
  "20261102000400_room_fandom.sql",
  "20261106001900_admin_fandom_requests.sql",
];

async function database(users: [string, string, string][]) {
  const db = new PGlite();
  await db.exec(bootstrap);
  // Accounts exist before the migration runs, as in the real project.
  await db.exec(readFileSync(`supabase/migrations/${migrations[0]}`, "utf8"));
  for (const [id, email, created] of users)
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at,created_at) values($1,$2,now(),$3)",
      [id, email, created],
    );
  for (const file of migrations.slice(1))
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  return db;
}
let db: PGlite;
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const request = async (
  name: string,
  category = "anime",
  note: string | null = null,
) =>
  (
    await db.query<{ id: string }>(
      "select public.request_fandom($1,$2,$3) id",
      [name, category, note],
    )
  ).rows[0].id;

beforeAll(async () => {
  db = await database([
    [owner, "Owner@example.org", "2026-11-01T10:00:00Z"],
    [member, "member@example.org", "2026-11-02T10:00:00Z"],
    [other, "other@example.org", "2026-11-03T10:00:00Z"],
  ]);
  // The operator grants the administrator once, as the migration explains.
  await db.query(
    "insert into public.admins(user_id) select id from auth.users where lower(email) = lower($1)",
    ["owner@example.org"],
  );
}, 120000);
afterAll(async () => {
  await db?.close();
});

it("has only the administrator the operator granted, and grants nobody by itself", async () => {
  await asUser(owner);
  expect((await db.query("select public.is_admin() a")).rows).toEqual([
    { a: true },
  ]);
  await asUser(member);
  expect((await db.query("select public.is_admin() a")).rows).toEqual([
    { a: false },
  ]);
  await expect(db.query("select * from public.admins")).rejects.toThrow();
  await expect(
    db.query("insert into public.admins(user_id) values($1)", [member]),
  ).rejects.toThrow();
  await expect(
    db.query("select * from public.admin_accounts()"),
  ).rejects.toThrow("forbidden");

  const later = await database([
    [owner, "owner@example.org", "2026-11-01T09:00:00Z"],
    [member, "member@example.org", "2026-11-01T10:00:00Z"],
  ]);
  // The migration alone makes nobody administrator, not even the first account.
  expect(
    (await later.query("select count(*)::int n from public.admins")).rows,
  ).toEqual([{ n: 0 }]);
  await later.close();
}, 60000);

it("lists every account, with emails, only to the administrator", async () => {
  await asUser(owner);
  const accounts = await db.query<{ email: string; is_admin: boolean }>(
    "select email, is_admin from public.admin_accounts()",
  );
  expect(accounts.rows.map((a) => a.email)).toEqual([
    "Owner@example.org",
    "member@example.org",
    "other@example.org",
  ]);
  expect(accounts.rows[0].is_admin).toBe(true);
});

it("lets members request fandoms and see only their own requests", async () => {
  await asUser(member);
  await request("Frieren Fanart Club", "anime", "Fan art and theories");
  await expect(request("Frieren Fanart Club")).rejects.toThrow(
    "request_exists",
  );
  await expect(request("Dune", "cinema")).rejects.toThrow("fandom_exists");
  await expect(request("x")).rejects.toThrow("invalid_request");
  await expect(request("Something", "cooking")).rejects.toThrow(
    "invalid_request",
  );
  await expect(request("Too Soon")).rejects.toThrow("slow_down");
  await asUser(other);
  expect(
    (await db.query("select 1 from public.fandom_requests")).rows,
  ).toHaveLength(0);
  await expect(
    db.query(
      "select public.decide_fandom_request(gen_random_uuid(), true, null)",
    ),
  ).rejects.toThrow("forbidden");
  await asUser(owner);
  expect(
    (await db.query("select name from public.fandom_requests")).rows,
  ).toEqual([{ name: "Frieren Fanart Club" }]);
});

it("approval adds a community fandom that rooms and follows can use", async () => {
  await asUser(owner);
  const pending = (
    await db.query<{ id: string }>(
      "select id from public.fandom_requests where name='Frieren Fanart Club'",
    )
  ).rows[0].id;
  const fid = (
    await db.query<{ f: string }>(
      "select public.decide_fandom_request($1,true,'Welcome') f",
      [pending],
    )
  ).rows[0].f;
  expect(fid).toMatch(/^community-[0-9a-f]{10}$/);
  await asUser(member);
  expect(
    (
      await db.query(
        "select name, community, description from public.fandoms where id=$1",
        [fid],
      )
    ).rows,
  ).toEqual([
    {
      name: "Frieren Fanart Club",
      community: true,
      description: "Fan art and theories",
    },
  ]);
  expect(
    (
      await db.query(
        "select status, reason from public.fandom_requests where id=$1",
        [pending],
      )
    ).rows,
  ).toEqual([{ status: "approved", reason: "Welcome" }]);
  // A public room can be tied to the new fandom.
  await db.query(
    "select public.create_room('Frieren night','','video','public','','orbit',$1)",
    [fid],
  );
  // Decided requests cannot be decided again.
  await asUser(owner);
  await expect(
    db.query("select public.decide_fandom_request($1,false,null)", [pending]),
  ).rejects.toThrow("request_unavailable");
}, 20000);

it("rejection keeps the request with its reason and adds no fandom", async () => {
  await asUser(other);
  await wait(1100);
  const rid = await request("Obscure Show", "cinema");
  await asUser(owner);
  await db.query("select public.decide_fandom_request($1,false,$2)", [
    rid,
    "Too niche for now",
  ]);
  await asUser(other);
  expect(
    (await db.query("select status, reason from public.fandom_requests")).rows,
  ).toEqual([{ status: "rejected", reason: "Too niche for now" }]);
  expect(
    (await db.query("select 1 from public.fandoms where name='Obscure Show'"))
      .rows,
  ).toHaveLength(0);
}, 20000);
