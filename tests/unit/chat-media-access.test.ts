import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
const owner = "10000000-0000-4000-8000-000000000001",
  member = "10000000-0000-4000-8000-000000000002",
  outsider = "10000000-0000-4000-8000-000000000003",
  unconfirmed = "10000000-0000-4000-8000-000000000004";
let db: PGlite, room: string;
const path = (user = owner) =>
  `${room}/${user}/20000000-0000-4000-8000-000000000001.webp`;
async function identity(id: string | null, role = "authenticated") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    id || "",
  ]);
  await db.exec(`set role ${role}`);
}
const put = (name = path()) =>
  db.query(
    'insert into storage.objects(bucket_id,name,metadata) values(\'chat-images\',$1,\'{"size":100,"mimetype":"image/webp"}\')',
    [name],
  );
const sendImage = (name = path(), width: number | null = 100) =>
  db.query<{ id: string }>(
    "select public.send_room_image($1,$2,$3,60,100) id",
    [room, name, width],
  );
describe.sequential("media SQL and Storage policies", () => {
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
    await db.exec(
      readFileSync("supabase/migrations/20261101000100_foundation.sql", "utf8"),
    );
    await db.exec(
      readFileSync("supabase/migrations/20261101000300_chat_media.sql", "utf8"),
    );
    await db.query(
      "insert into auth.users values($1,now()),($2,now()),($3,now()),($4,null)",
      [owner, member, outsider, unconfirmed],
    );
    await identity(owner);
    room = (
      await db.query<{ id: string }>(
        "select public.create_room('Media room','','video','private','','orbit') id",
      )
    ).rows[0].id;
    await db.exec("reset role");
    await db.query(
      "insert into public.room_members(room_id,user_id,role) values($1,$2,'member'),($1,$3,'member')",
      [room, member, unconfirmed],
    );
  }, 120000);
  beforeEach(async () => {
    await db.exec(
      "reset role; delete from public.room_messages; delete from storage.objects; update public.room_members set status='active'; update public.rooms set closed_at=null;",
    );
    await identity(owner);
  });
  afterAll(async () => {
    await db?.close();
  });
  it("adds a private, bounded bucket and allows known stickers", async () => {
    expect(
      (await db.query("select public.chat_media_capabilities() enabled")).rows,
    ).toEqual([{ enabled: true }]);
    await db.query("select public.send_room_sticker($1,'love')", [room]);
    expect(
      (await db.query("select kind,sticker_id from public.room_messages")).rows,
    ).toEqual([{ kind: "sticker", sticker_id: "love" }]);
    await expect(
      db.query("select public.send_room_sticker($1,'unknown')", [room]),
    ).rejects.toThrow();
  });
  it("shares text/sticker/image rate limiting", async () => {
    await put();
    await db.query("select public.send_room_message($1,'hello')", [room]);
    await expect(
      db.query("select public.send_room_sticker($1,'hey')", [room]),
    ).rejects.toThrow(/slow_down/);
    await expect(sendImage()).rejects.toThrow(/slow_down/);
  });
  it("blocks outsiders, unconfirmed accounts and forged upload paths", async () => {
    await identity(outsider);
    await expect(put(path(outsider))).rejects.toThrow();
    await expect(
      db.query("select public.send_room_sticker($1,'hey')", [room]),
    ).rejects.toThrow();
    await identity(unconfirmed);
    await expect(put(path(unconfirmed))).rejects.toThrow();
    await identity(member);
    await expect(put(path(owner))).rejects.toThrow();
    await expect(put("not/a/valid.webp")).rejects.toThrow();
  });
  it("requires a stored file owned by the sender, valid dimensions, and one message per object", async () => {
    await expect(sendImage()).rejects.toThrow();
    await put();
    await expect(sendImage(path(), null)).rejects.toThrow();
    await expect(sendImage(path(), 1281)).rejects.toThrow();
    await identity(member);
    await expect(sendImage(path(owner))).rejects.toThrow();
    await identity(owner);
    await sendImage();
    await db.exec(
      "reset role; update public.room_messages set created_at=now()-interval '10 seconds'",
    );
    await identity(owner);
    await expect(sendImage()).rejects.toThrow();
    expect(
      (await db.query("select kind from public.room_messages")).rows,
    ).toEqual([{ kind: "image" }]);
  });
  it("revokes image reads and writes after kick, and denies anonymous reads", async () => {
    await put();
    await sendImage();
    await identity(member);
    expect(
      (await db.query("select name from storage.objects")).rows,
    ).toHaveLength(1);
    await identity(owner);
    await db.query("select public.moderate_room($1,$2,'kick')", [room, member]);
    await identity(member);
    expect(
      (await db.query("select name from storage.objects")).rows,
    ).toHaveLength(0);
    await expect(put(path(member))).rejects.toThrow();
    await identity(null, "anon");
    await expect(
      db.query("select name from storage.objects"),
    ).rejects.toThrow();
  });
  it("cannot replace or remove a posted attachment; author cleanup follows message deletion", async () => {
    await put();
    const id = (await sendImage()).rows[0].id;
    expect(
      (
        await db.query(
          "update storage.objects set metadata='{}' returning name",
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("delete from storage.objects returning name")).rows,
    ).toHaveLength(0);
    await db.query("select public.delete_room_message($1)", [id]);
    expect(
      (await db.query("delete from storage.objects returning name")).rows,
    ).toHaveLength(1);
  });
  it("closed rooms do not accept uploads or stickers", async () => {
    await db.query("select public.moderate_room($1,$2,'close')", [room, owner]);
    await expect(put()).rejects.toThrow();
    await expect(
      db.query("select public.send_room_sticker($1,'hey')", [room]),
    ).rejects.toThrow();
  });
  it("lets the owner clean a member attachment after moderating its message", async () => {
    await identity(member);
    await put(path(member));
    const id = (await sendImage(path(member))).rows[0].id;
    await identity(owner);
    await db.query("select public.delete_room_message($1)", [id]);
    expect(
      (await db.query("delete from storage.objects returning name")).rows,
    ).toHaveLength(1);
  });
});
