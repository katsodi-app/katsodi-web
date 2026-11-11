import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, expect, it } from "vitest";
let db: PGlite, room: string;
const owner = "10000000-0000-4000-8000-000000000001",
  member = "10000000-0000-4000-8000-000000000002";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const file of [
    "20261101000100_foundation.sql",
    "20261103000600_voice.sql",
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.query("insert into auth.users values($1,now()),($2,now())", [
    owner,
    member,
  ]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    owner,
  ]);
  await db.exec("set role authenticated");
  room = (
    await db.query<{ id: string }>(
      "select public.create_room('Voice test','','video','private','','orbit') id",
    )
  ).rows[0].id;
  await db.exec("reset role");
  await db.query(
    "insert into public.room_members(room_id,user_id,role)values($1,$2,'member')",
    [room, member],
  );
}, 120000);
afterAll(async () => {
  await db?.close();
});
it("keeps the queue private and persists kicks and room closure, with fail-closed readiness", async () => {
  await db.exec("set role authenticated");
  expect(
    (
      await db.query<{ ready: boolean }>(
        "select public.voice_worker_ready($1) ready",
        [room],
      )
    ).rows[0].ready,
  ).toBe(false);
  await expect(
    db.query("select * from public.voice_revocations"),
  ).rejects.toThrow("permission denied");
  await db.exec(
    "reset role;insert into public.voice_worker_state values(true,now())",
  );
  await db.exec("set role authenticated");
  expect(
    (
      await db.query<{ ready: boolean }>(
        "select public.voice_worker_ready($1) ready",
        [room],
      )
    ).rows[0].ready,
  ).toBe(true);
  await db.query("select public.moderate_room($1,$2,'kick')", [room, member]);
  await db.exec("reset role");
  const jobs = await db.query<{ user_id: string }>(
    "select user_id from public.voice_revocations where room_id=$1",
    [room],
  );
  expect(jobs.rows.map((r) => r.user_id)).toContain(member);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    member,
  ]);
  await db.exec("set role authenticated");
  expect(
    (
      await db.query<{ ready: boolean }>(
        "select public.voice_worker_ready($1) ready",
        [room],
      )
    ).rows[0].ready,
  ).toBe(false);
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    owner,
  ]);
  await db.exec("set role authenticated");
  await db.query("select public.moderate_room($1,$2,'close')", [room, owner]);
  await db.exec("reset role");
  expect(
    (
      await db.query(
        "select 1 from public.voice_revocations where user_id is null",
      )
    ).rows.length,
  ).toBe(1);
});
it("queues email-confirmation withdrawal and refuses an expired heartbeat", async () => {
  await db.exec("reset role;delete from public.voice_revocations");
  await db.query("update auth.users set email_confirmed_at=null where id=$1", [
    member,
  ]);
  expect(
    (
      await db.query(
        "select 1 from public.voice_revocations where user_id=$1",
        [member],
      )
    ).rows.length,
  ).toBe(0);
  // The kicked member is no longer active. An active owner's verification change queues a job.
  await db.query("update auth.users set email_confirmed_at=null where id=$1", [
    owner,
  ]);
  expect(
    (
      await db.query(
        "select 1 from public.voice_revocations where user_id=$1",
        [owner],
      )
    ).rows.length,
  ).toBe(1);
  await db.exec(
    "delete from public.voice_revocations;update public.voice_worker_state set last_seen=now()-interval '5 minutes'",
  );
  await db.exec("set role authenticated");
  expect(
    (
      await db.query<{ ready: boolean }>(
        "select public.voice_worker_ready($1) ready",
        [room],
      )
    ).rows[0].ready,
  ).toBe(false);
});
