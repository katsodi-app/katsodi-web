import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, expect, it } from "vitest";
const me = "10000000-0000-4000-8000-000000000001",
  roommate = "10000000-0000-4000-8000-000000000002",
  stranger = "10000000-0000-4000-8000-000000000003";
let db: PGlite, room: string;
const file = (user: string, kind: "avatar" | "banner", n = 1) =>
  `${user}/${kind}-20000000-0000-4000-8000-00000000000${n}.webp`;
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
const put = (name: string, size = 1000) =>
  db.query(
    "insert into storage.objects(bucket_id,name,metadata) values('profile-media',$1,$2)",
    [name, JSON.stringify({ size, mimetype: "image/webp" })],
  );
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text unique,metadata jsonb);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated; grant select,insert,update,delete on storage.objects to authenticated;`);
  for (const migration of [
    "20261101000100_foundation.sql",
    "20261101000200_fandom_seed.sql",
    "20261104001300_profile_media.sql",
  ])
    await db.exec(readFileSync(`supabase/migrations/${migration}`, "utf8"));
  await db.query(
    "insert into auth.users values($1,now()),($2,now()),($3,now())",
    [me, roommate, stranger],
  );
  await asUser(me);
  room = (
    await db.query<{ id: string }>(
      "select public.create_room('Friends','','video','private','','orbit') id",
    )
  ).rows[0].id;
  await db.exec("reset role");
  await db.query(
    "insert into public.room_members(room_id,user_id,role) values($1,$2,'member')",
    [room, roommate],
  );
}, 120000);
afterAll(async () => {
  await db?.close();
});
it("lets a user upload only into their own folder, a few files at a time", async () => {
  await asUser(me);
  await put(file(me, "avatar"));
  await expect(put(file(roommate, "avatar"))).rejects.toThrow();
  await expect(put(`${me}/other-file.webp`)).rejects.toThrow();
  for (let n = 2; n <= 6; n++) await put(file(me, "banner", n));
  // The sixth object would exceed the per-user cap of six.
  await expect(put(file(me, "banner", 7))).rejects.toThrow();
  await db.exec("reset role");
  await db.query("delete from storage.objects where name like $1", [
    `${me}/banner-%`,
  ]);
});
it("points the profile at an uploaded object and returns the old path", async () => {
  await asUser(me);
  const first = await db.query<{ old: string | null }>(
    "select public.set_profile_media('avatar',$1) old",
    [file(me, "avatar")],
  );
  expect(first.rows[0].old).toBeNull();
  await expect(
    db.query("select public.set_profile_media('banner',$1)", [
      file(me, "avatar"),
    ]),
  ).rejects.toThrow("invalid_media");
  await expect(
    db.query("select public.set_profile_media('avatar',$1)", [
      file(me, "avatar", 9),
    ]),
  ).rejects.toThrow("invalid_media");
  await expect(
    db.query("select public.set_profile_media('avatar',$1)", [
      file(me, "avatar"),
    ]),
  ).rejects.toThrow("slow_down");
  // Direct writes to the media columns are not allowed.
  await expect(
    db.query("update public.profiles set avatar_path=null where id=$1", [me]),
  ).rejects.toThrow();
  await wait(3100);
  await put(file(me, "avatar", 2));
  const second = await db.query<{ old: string | null }>(
    "select public.set_profile_media('avatar',$1) old",
    [file(me, "avatar", 2)],
  );
  expect(second.rows[0].old).toBe(file(me, "avatar"));
  expect(
    (
      await db.query<{ old: string | null }>(
        "select public.clear_profile_media('avatar') old",
      )
    ).rows[0].old,
  ).toBe(file(me, "avatar", 2));
});
it("shows media and fandoms to roommates, not to strangers", async () => {
  await asUser(me);
  await db.query("select public.set_my_fandoms($1)", [["cinema-1", "anime-1"]]);
  await asUser(roommate);
  expect(
    (
      await db.query(
        "select name from storage.objects where bucket_id='profile-media'",
      )
    ).rows.length,
  ).toBeGreaterThan(0);
  expect(
    (
      await db.query<{ fandom_id: string }>(
        "select fandom_id from public.user_fandoms where user_id=$1 order by fandom_id",
        [me],
      )
    ).rows.map((r) => r.fandom_id),
  ).toEqual(["anime-1", "cinema-1"]);
  await asUser(stranger);
  expect(
    (
      await db.query(
        "select name from storage.objects where bucket_id='profile-media'",
      )
    ).rows,
  ).toEqual([]);
  expect(
    (await db.query("select * from public.user_fandoms where user_id=$1", [me]))
      .rows,
  ).toEqual([]);
  await expect(
    db.query("delete from storage.objects where name=$1", [file(me, "avatar")]),
  ).resolves.toMatchObject({ affectedRows: 0 });
});
