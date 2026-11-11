import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
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
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const file of [
    "20261101000100_foundation.sql",
    "20261102000500_room_player.sql",
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  for (const id of [owner, moderator, member, outsider])
    await db.query("insert into auth.users values($1,now())", [id]);
  await asUser(owner);
  room = (
    await db.query<{ id: string }>(
      "select public.create_room('Player test','','video','private','','orbit') id",
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
it("allows source control only to active verified owners/moderators and broadcasts one stored source", async () => {
  await asUser(member);
  await expect(
    db.query("select public.set_room_source($1,$2)", [
      room,
      "https://youtu.be/M7lc1UVf-VE",
    ]),
  ).rejects.toThrow("room_unavailable");
  await asUser(outsider);
  await expect(
    db.query("select public.set_room_source($1,$2)", [
      room,
      "https://youtu.be/M7lc1UVf-VE",
    ]),
  ).rejects.toThrow("room_unavailable");
  await asUser(owner);
  await db.query("select public.set_room_source($1,$2)", [
    room,
    "https://youtu.be/M7lc1UVf-VE",
  ]);
  await expect(
    db.query("select public.set_room_source($1,$2)", [
      room,
      "https://kinogo.is/240-diuna.html",
    ]),
  ).rejects.toThrow("slow_down");
  await asUser(member);
  expect(
    (
      await db.query<{ url: string }>(
        "select url from public.rooms where id=$1",
        [room],
      )
    ).rows[0].url,
  ).toBe("https://youtu.be/M7lc1UVf-VE");
  await db.exec("reset role");
  await db.query(
    "update public.rooms set source_updated_at=now()-interval '10 seconds' where id=$1",
    [room],
  );
  await asUser(moderator);
  await db.query("select public.set_room_source($1,$2)", [
    room,
    "https://kinogo.is/240-diuna.html",
  ]);
  await db.exec("reset role");
  await db.query(
    "update public.room_members set status='kicked' where room_id=$1 and user_id=$2",
    [room, moderator],
  );
  await asUser(moderator);
  await expect(
    db.query("select public.set_room_source($1,'')", [room]),
  ).rejects.toThrow("room_unavailable");
  await asUser(owner);
  await expect(
    db.query("select public.set_room_source($1,'javascript:alert(1)')", [room]),
  ).rejects.toThrow("invalid_source");
  await db.exec("reset role");
  await db.query("update public.rooms set closed_at=now() where id=$1", [room]);
  await asUser(owner);
  await expect(
    db.query("select public.set_room_source($1,'')", [room]),
  ).rejects.toThrow("room_unavailable");
});
