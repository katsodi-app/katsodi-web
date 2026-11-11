import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

const owner = "10000000-0000-4000-8000-000000000001";
const member = "10000000-0000-4000-8000-000000000002";
const outsider = "10000000-0000-4000-8000-000000000003";
const unconfirmed = "10000000-0000-4000-8000-000000000004";
const token = "a".repeat(43);
let db: PGlite, room: string, publicRoom: string, message: string;
async function asUser(id: string | null, role = "authenticated") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    id || "",
  ]);
  await db.exec(`set role ${role}`);
}
describe.sequential("PostgreSQL policies and atomic room operations", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;`);
    await db.exec(
      readFileSync("supabase/migrations/20261101000100_foundation.sql", "utf8"),
    );
    await db.exec(
      readFileSync(
        "supabase/migrations/20261101000200_fandom_seed.sql",
        "utf8",
      ),
    );
    await db.exec(
      readFileSync(
        "supabase/migrations/20261104000700_rejoin_role_reset.sql",
        "utf8",
      ),
    );
    await db.exec(
      readFileSync(
        "supabase/migrations/20261104000800_message_sender_index.sql",
        "utf8",
      ),
    );
    await db.query(
      "insert into auth.users values($1,now()),($2,now()),($3,now()),($4,null)",
      [owner, member, outsider, unconfirmed],
    );
    await asUser(owner);
    const privateResult = await db.query<{ id: string }>(
      "select public.create_room('Secret evening','','video','private','','orbit') id",
    );
    room = privateResult.rows[0].id;
    publicRoom = (
      await db.query<{ id: string }>(
        "select public.create_room('Public evening','','music','public','','wave') id",
      )
    ).rows[0].id;
  }, 120000);
  afterAll(async () => {
    await db?.close();
  });
  it("provisions profiles and limits anonymous discovery to public rooms", async () => {
    await asUser(null, "anon");
    expect((await db.query("select id from public.rooms")).rows).toEqual([
      { id: publicRoom },
    ]);
    await expect(db.query("select * from public.profiles")).rejects.toThrow();
    await expect(
      db.query("select public.join_room($1)", [publicRoom]),
    ).rejects.toThrow();
  });
  it("denies direct inserts, owner forgery and unconfirmed accounts", async () => {
    await asUser(outsider);
    await expect(
      db.query(
        "insert into public.rooms(owner_id,name,format,visibility) values($1,'Forged room','video','public')",
        [owner],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into public.room_members(room_id,user_id,role) values($1,$2,'owner')",
        [room, outsider],
      ),
    ).rejects.toThrow();
    await expect(
      db.query("select public.join_room($1)", [room]),
    ).rejects.toThrow();
    await asUser(unconfirmed);
    await expect(
      db.query(
        "select public.create_room('No email','','video','public','','orbit')",
      ),
    ).rejects.toThrow();
  });
  it("creates a bounded invite, stores only its hash, and consumes it atomically", async () => {
    await asUser(owner);
    await (
      await db.query<{ id: string }>(
        "select public.create_room_invite($1,$2,1) id",
        [room, createHash("sha256").update(token).digest("hex")],
      )
    ).rows[0].id;
    await expect(
      db.query("select token_hash from public.room_invites"),
    ).rejects.toThrow();
    await asUser(member);
    expect(
      (
        await db.query<{ id: string }>(
          "select public.redeem_room_invite($1) id",
          [token],
        )
      ).rows[0].id,
    ).toBe(room);
    await asUser(outsider);
    await expect(
      db.query("select public.redeem_room_invite($1)", [token]),
    ).rejects.toThrow();
    expect(
      (await db.query("select id from public.rooms where id=$1", [room])).rows,
    ).toHaveLength(0);
  });
  it("makes chat readable and writable only to active members", async () => {
    await asUser(outsider);
    await expect(
      db.query("select public.send_room_message($1,$2)", [room, "Intruder"]),
    ).rejects.toThrow();
    expect(
      (
        await db.query("select * from public.room_messages where room_id=$1", [
          room,
        ])
      ).rows,
    ).toHaveLength(0);
    await asUser(member);
    message = (
      await db.query<{ id: string }>(
        "select public.send_room_message($1,$2) id",
        [room, "Hello from another client"],
      )
    ).rows[0].id;
    await expect(
      db.query("select public.send_room_message($1,$2)", [room, "Too fast"]),
    ).rejects.toThrow();
    await asUser(owner);
    expect(
      (
        await db.query(
          "select body from public.room_messages where room_id=$1",
          [room],
        )
      ).rows,
    ).toEqual([{ body: "Hello from another client" }]);
    await expect(
      db.query("select public.moderate_room($1,$2,'kick')", [room, owner]),
    ).rejects.toThrow();
  });
  it("allows message deletion only to its author or an active room moderator", async () => {
    await asUser(owner);
    const mid = (
      await db.query<{ id: string }>(
        "select public.send_room_message($1,$2) id",
        [publicRoom, "Owner message"],
      )
    ).rows[0].id;
    await asUser(outsider);
    await expect(
      db.query("select public.delete_room_message($1)", [mid]),
    ).rejects.toThrow();
    await asUser(owner);
    await db.query("select public.delete_room_message($1)", [mid]);
    expect(
      (await db.query("select id from public.room_messages where id=$1", [mid]))
        .rows,
    ).toHaveLength(0);
  });
  it("revokes access immediately after a kick and prevents invite bypass", async () => {
    await asUser(owner);
    await db.query("select public.moderate_room($1,$2,'kick')", [room, member]);
    const newToken = "b".repeat(43);
    await db.query("select public.create_room_invite($1,$2,10)", [
      room,
      createHash("sha256").update(newToken).digest("hex"),
    ]);
    await asUser(member);
    expect(
      (
        await db.query("select * from public.room_messages where room_id=$1", [
          room,
        ])
      ).rows,
    ).toHaveLength(0);
    await expect(
      db.query("select public.send_room_message($1,$2)", [room, "After kick"]),
    ).rejects.toThrow();
    await expect(
      db.query("select public.redeem_room_invite($1)", [newToken]),
    ).rejects.toThrow();
    await expect(
      db.query("select public.delete_room_message($1)", [message]),
    ).rejects.toThrow();
  });
  it("enforces invite revocation and expiry", async () => {
    await asUser(owner);
    const revokeToken = "c".repeat(43);
    const iid = (
      await db.query<{ id: string }>(
        "select public.create_room_invite($1,$2,10) id",
        [room, createHash("sha256").update(revokeToken).digest("hex")],
      )
    ).rows[0].id;
    await db.query("select public.revoke_room_invite($1)", [iid]);
    await asUser(outsider);
    await expect(
      db.query("select public.redeem_room_invite($1)", [revokeToken]),
    ).rejects.toThrow();
    await asUser(owner);
    const expiredToken = "d".repeat(43);
    const expiredId = (
      await db.query<{ id: string }>(
        "select public.create_room_invite($1,$2,10) id",
        [room, createHash("sha256").update(expiredToken).digest("hex")],
      )
    ).rows[0].id;
    await db.exec("reset role");
    await db.query(
      "update public.room_invites set expires_at=now()-interval '1 second' where id=$1",
      [expiredId],
    );
    await asUser(outsider);
    await expect(
      db.query("select public.redeem_room_invite($1)", [expiredToken]),
    ).rejects.toThrow();
  });
  it("prevents profile and fandom edits on behalf of other users", async () => {
    await asUser(outsider);
    expect(
      (
        await db.query(
          "update public.profiles set display_name='Intruder' where id=$1 returning id",
          [owner],
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      db.query("update public.profiles set id=$1 where id=$2", [
        owner,
        outsider,
      ]),
    ).rejects.toThrow();
    await expect(
      db.query("select public.set_my_fandoms(array['unknown'])"),
    ).rejects.toThrow();
  });
  it("saves profile and interests atomically, rolling back an invalid catalogue ID", async () => {
    await asUser(owner);
    const before = (
      await db.query<{ display_name: string }>(
        "select display_name from public.profiles where id=$1",
        [owner],
      )
    ).rows[0].display_name;
    await expect(
      db.query(
        "select public.update_my_profile('owner_example','New name','Bio',array['missing'])",
      ),
    ).rejects.toThrow();
    expect(
      (
        await db.query<{ display_name: string }>(
          "select display_name from public.profiles where id=$1",
          [owner],
        )
      ).rows[0].display_name,
    ).toBe(before);
    await db.query(
      "select public.update_my_profile('owner_example','New name','Bio',array['anime-1'])",
    );
    expect(
      (
        await db.query(
          "select fandom_id from public.user_fandoms where user_id=$1",
          [owner],
        )
      ).rows,
    ).toEqual([{ fandom_id: "anime-1" }]);
  });
  it("lets the owner revoke a moderator role even after that moderator leaves", async () => {
    await asUser(outsider);
    await db.query("select public.join_room($1)", [publicRoom]);
    await asUser(owner);
    await db.query("select public.moderate_room($1,$2,'promote')", [
      publicRoom,
      outsider,
    ]);
    await asUser(outsider);
    await db.query("select public.moderate_room($1,$2,'leave')", [
      publicRoom,
      outsider,
    ]);
    await asUser(owner);
    await db.query("select public.moderate_room($1,$2,'demote')", [
      publicRoom,
      outsider,
    ]);
    await asUser(outsider);
    await db.query("select public.join_room($1)", [publicRoom]);
    expect(
      (
        await db.query<{ role: string }>(
          "select role from public.room_members where room_id=$1 and user_id=$2",
          [publicRoom, outsider],
        )
      ).rows[0].role,
    ).toBe("member");
  });
  it("indexes the per-sender message rate-limit lookup", async () => {
    await db.exec("reset role");
    expect(
      (
        await db.query<{ indexdef: string }>(
          "select indexdef from pg_indexes where indexname='room_messages_sender_recent'",
        )
      ).rows[0]?.indexdef,
    ).toMatch(/\(sender_id, created_at DESC\)/);
  });
  it("drops a moderator role when the moderator leaves and rejoins without a demotion", async () => {
    const role = async () =>
      (
        await db.query<{ role: string }>(
          "select role from public.room_members where room_id=$1 and user_id=$2",
          [publicRoom, outsider],
        )
      ).rows[0].role;
    await asUser(outsider);
    await db.query("select public.join_room($1)", [publicRoom]);
    await asUser(owner);
    await db.query("select public.moderate_room($1,$2,'promote')", [
      publicRoom,
      outsider,
    ]);
    await asUser(outsider);
    await db.query("select public.moderate_room($1,$2,'leave')", [
      publicRoom,
      outsider,
    ]);
    await db.query("select public.join_room($1)", [publicRoom]);
    expect(await role()).toBe("member");
  });
  it("lets a public visitor join but not assign roles or keep writing after close", async () => {
    await asUser(outsider);
    await db.query("select public.join_room($1)", [publicRoom]);
    await expect(
      db.query("select public.moderate_room($1,$2,'promote')", [
        publicRoom,
        outsider,
      ]),
    ).rejects.toThrow();
    await asUser(owner);
    await db.query("select public.moderate_room($1,$2,'close')", [
      publicRoom,
      owner,
    ]);
    await asUser(outsider);
    await expect(
      db.query("select public.send_room_message($1,$2)", [
        publicRoom,
        "Closed",
      ]),
    ).rejects.toThrow();
  });
  it("denies private reads after email confirmation is withdrawn from an existing member", async () => {
    await db.exec("reset role");
    await db.query(
      "update auth.users set email_confirmed_at=null where id=$1",
      [owner],
    );
    await asUser(owner);
    expect(
      (await db.query("select * from public.rooms where id=$1", [room])).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query("select * from public.room_messages where room_id=$1", [
          room,
        ])
      ).rows,
    ).toHaveLength(0);
    expect((await db.query("select * from public.profiles")).rows).toHaveLength(
      0,
    );
  });
});
