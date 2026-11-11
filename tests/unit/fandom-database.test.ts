import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite;
const owner = "10000000-0000-4000-8000-000000000001";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const file of [
    "20261101000100_foundation.sql",
    "20261101000200_fandom_seed.sql",
  ]) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  }
  await db.query("insert into auth.users values($1,now())", [owner]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    owner,
  ]);
  await db.exec(
    "set role authenticated;select public.create_room('Legacy room','','video','public','','orbit');reset role;",
  );
  await db.exec(
    readFileSync("supabase/migrations/20261102000400_room_fandom.sql", "utf8"),
  );
}, 120000);
afterAll(async () => {
  await db?.close();
});

it("enforces fandoms, preserves legacy rows and keeps private/closed rooms out of discovery", async () => {
  await db.exec("set role authenticated");
  await expect(
    db.query(
      "select public.create_room('No fandom','','video','public','','orbit')",
    ),
  ).rejects.toThrow("fandom_required");
  await expect(
    db.query(
      "select public.create_room('Bad fandom','','video','public','','orbit','cinema-999')",
    ),
  ).rejects.toThrow();
  await db.exec(
    "select public.create_room('Dune public','','video','public','','orbit','cinema-6');select public.create_room('Dune private','','video','private','','orbit','cinema-6');select public.create_room('Anime public','','video','public','','orbit','anime-0');select public.create_room('Private optional','','video','private','','orbit');reset role;select set_config('request.jwt.claim.sub','',false);set role anon;",
  );
  const rooms = await db.query<{ name: string }>(
    "select name from public.rooms where fandom_id='cinema-6' and visibility='public' and closed_at is null",
  );
  expect(rooms.rows).toEqual([{ name: "Dune public" }]);
  expect(
    (await db.query("select name from public.rooms where fandom_id is null"))
      .rows,
  ).toEqual([{ name: "Legacy room" }]);
  await expect(
    db.query(
      "select public.create_room('Anonymous room','','video','public','','orbit','cinema-6')",
    ),
  ).rejects.toThrow();
  await db.exec(
    "reset role;update public.rooms set closed_at=now() where name='Dune public';set role anon;",
  );
  expect(
    (await db.query("select id from public.rooms where fandom_id='cinema-6'"))
      .rows,
  ).toEqual([]);
});

it("migration 24 permits Other without weakening account, membership or room limits", async () => {
  await db.exec("reset role");
  await db.exec(
    readFileSync(
      "supabase/migrations/20261109002400_optional_room_fandom.sql",
      "utf8",
    ),
  );
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    owner,
  ]);
  await db.exec("set role authenticated");
  const created = await db.query<{ id: string }>(
    "select public.create_room('Other public','','music','public','','wave') as id",
  );
  const id = created.rows[0].id;
  expect(
    (
      await db.query(
        "select fandom_id,visibility from public.rooms where id=$1",
        [id],
      )
    ).rows,
  ).toEqual([{ fandom_id: null, visibility: "public" }]);
  expect(
    (
      await db.query(
        "select role from public.room_members where room_id=$1 and user_id=$2",
        [id, owner],
      )
    ).rows,
  ).toEqual([{ role: "owner" }]);
  await expect(
    db.query(
      "select public.create_room('Bad association','','video','public','','orbit','made-up')",
    ),
  ).rejects.toThrow();
  const count = (
    await db.query<{ count: number }>(
      "select count(*)::int as count from public.rooms where owner_id=$1 and closed_at is null",
      [owner],
    )
  ).rows[0].count;
  for (let i = count; i < 20; i++)
    await db.query(
      "select public.create_room('Optional room','','video','public','','orbit')",
    );
  await expect(
    db.query(
      "select public.create_room('Over limit','','video','public','','orbit')",
    ),
  ).rejects.toThrow("room_limit");
  await db.exec(
    "reset role;select set_config('request.jwt.claim.sub','',false);set role anon",
  );
  expect(
    (await db.query("select id from public.rooms where id=$1", [id])).rows,
  ).toHaveLength(1);
  await expect(
    db.query(
      "select public.create_room('Anonymous room','','video','public','','orbit')",
    ),
  ).rejects.toThrow();
});
