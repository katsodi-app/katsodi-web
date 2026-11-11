import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";

let db: PGlite;
const owner = "10000000-0000-4000-8000-000000000001",
  member = "10000000-0000-4000-8000-000000000002",
  outsider = "10000000-0000-4000-8000-000000000003";
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
const room = async (name: string) => {
  await asUser(owner);
  const id = (
    await db.query<{ id: string }>(
      "select public.create_room($1,'','video','private','','orbit') id",
      [name],
    )
  ).rows[0].id;
  await db.exec("reset role");
  await db.query(
    "insert into public.room_members(room_id,user_id,role) values($1,$2,'member')",
    [id, member],
  );
  return id;
};
// Simulates time: the room was last occupied this long ago.
const emptyFor = async (id: string, minutes: number) => {
  // Test-only time travel, as the database owner (members cannot edit rooms).
  await db.exec("reset role");
  await db.query(
    `update public.rooms set last_occupied_at = now() - make_interval(mins => $2) where id = $1`,
    [id, minutes],
  );
};
const state = async (id: string) => {
  await db.exec("reset role");
  return (
    (
      await db.query<{ inactive: boolean }>(
        "select inactive_at is not null inactive from public.rooms where id=$1",
        [id],
      )
    ).rows[0] ?? null
  );
};
const lifecycle = async () => {
  await db.exec("reset role");
  await db.exec("set role service_role");
  const result = (
    await db.query<{ inactive: number; deleted: number }>(
      "select * from public.run_room_lifecycle()",
    )
  ).rows[0];
  await db.exec("reset role");
  return result;
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const file of [
    "20261101000100_foundation.sql",
    "20261103000600_voice.sql",
    "20261104001100_room_queue.sql",
    "20261106002000_room_lifecycle.sql",
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.exec("grant usage on schema public to service_role");
  for (const id of [owner, member, outsider])
    await db.query("insert into auth.users values($1,now())", [id]);
}, 120000);
afterAll(async () => {
  await db?.close();
});

it("marks a room inactive after 10 empty minutes and keeps it before that", async () => {
  const id = await room("Ten minutes");
  await emptyFor(id, 9);
  await lifecycle();
  expect(await state(id)).toEqual({ inactive: false });
  await emptyFor(id, 11);
  expect(await lifecycle()).toMatchObject({ inactive: 1, deleted: 0 });
  expect(await state(id)).toEqual({ inactive: true });
});

it("a member returning clears inactivity and restarts the clock", async () => {
  const id = await room("Comeback");
  await emptyFor(id, 25);
  await lifecycle();
  expect(await state(id)).toEqual({ inactive: true });
  await asUser(member);
  await db.query("select public.room_occupancy_ping($1)", [id]);
  expect(await state(id)).toEqual({ inactive: false });
  // Nearly 30 minutes had passed, but presence reset the timer.
  await lifecycle();
  expect(await state(id)).toEqual({ inactive: false });
});

it("outsiders' pings do not count as occupancy", async () => {
  const id = await room("Outsider");
  await emptyFor(id, 15);
  await lifecycle();
  await asUser(outsider);
  await db.query("select public.room_occupancy_ping($1)", [id]);
  expect(await state(id)).toEqual({ inactive: true });
});

it("deletes a room empty for 30 minutes with its data, queueing image cleanup", async () => {
  const id = await room("Thirty minutes");
  await asUser(member);
  await db.query("select public.send_room_message($1,'hello')", [id]);
  await db.query("select public.add_room_queue($1,$2)", [
    id,
    "https://vimeo.com/76979871",
  ]);
  await emptyFor(id, 31);
  const result = await lifecycle();
  expect(result.deleted).toBeGreaterThanOrEqual(1);
  expect(await state(id)).toBeNull();
  for (const table of ["room_members", "room_messages", "room_queue"])
    expect(
      (await db.query(`select 1 from public.${table} where room_id=$1`, [id]))
        .rows,
    ).toHaveLength(0);
  expect(
    (
      await db.query(
        "select 1 from public.room_storage_cleanup where room_id=$1",
        [id],
      )
    ).rows,
  ).toHaveLength(1);
  // Voice/demo access is revoked through the durable queue.
  expect(
    (
      await db.query(
        "select 1 from public.voice_revocations where room_id=$1 and user_id is null",
        [id],
      )
    ).rows.length,
  ).toBeGreaterThanOrEqual(1);
}, 20000);

it("only the trusted scheduler can run the lifecycle", async () => {
  await asUser(owner);
  await expect(
    db.query("select * from public.run_room_lifecycle()"),
  ).rejects.toThrow();
  await expect(
    db.query("select * from public.room_storage_cleanup"),
  ).rejects.toThrow();
});
