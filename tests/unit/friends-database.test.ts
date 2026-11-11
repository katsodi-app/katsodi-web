import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, beforeEach, expect, it } from "vitest";
let db: PGlite;
const ana = "10000000-0000-4000-8000-000000000001",
  ben = "10000000-0000-4000-8000-000000000002",
  cy = "10000000-0000-4000-8000-000000000003",
  dee = "10000000-0000-4000-8000-000000000004";
const names: Record<string, string> = {
  [ana]: "ana",
  [ben]: "ben",
  [cy]: "cy_x",
  [dee]: "dee",
};
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
const send = async (username: string) =>
  (
    await db.query<{ r: string }>("select public.send_friend_request($1) r", [
      username,
    ])
  ).rows[0].r;
type Overview = {
  friends: { username: string }[];
  incoming: { id: string; username: string }[];
  outgoing: { id: string; username: string }[];
  blocked: { username: string }[];
};
const overview = async () =>
  (await db.query<{ o: Overview }>("select public.friends_overview() o"))
    .rows[0].o;
const usernames = (rows: { username: string }[]) => rows.map((r) => r.username);
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const file of [
    "20261101000100_foundation.sql",
    "20261104001400_friends.sql",
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  for (const id of [ana, ben, cy, dee]) {
    await db.query("insert into auth.users values($1,now())", [id]);
    await db.query(
      "update public.profiles set username=$2, display_name=$2 where id=$1",
      [id, names[id]],
    );
  }
}, 120000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.exec("reset role");
  await db.exec(
    "delete from public.friendships; delete from public.friend_requests; delete from public.user_blocks; delete from public.friend_request_log;",
  );
});
it("sends, accepts and lists friendships for both people", async () => {
  await asUser(ana);
  expect(await send("BEN")).toBe("sent");
  expect(usernames((await overview()).outgoing)).toEqual(["ben"]);
  await asUser(ben);
  const incoming = (await overview()).incoming;
  expect(usernames(incoming)).toEqual(["ana"]);
  await db.query("select public.respond_friend_request($1,true)", [
    incoming[0].id,
  ]);
  expect(usernames((await overview()).friends)).toEqual(["ana"]);
  await asUser(ana);
  expect(usernames((await overview()).friends)).toEqual(["ben"]);
  expect((await overview()).outgoing).toEqual([]);
  // The 2-second send limit applies to repeat attempts too.
  await new Promise((r) => setTimeout(r, 2100));
  expect(await send("ben")).toBe("already");
});
it("turns crossing requests into a friendship and lets the sender cancel", async () => {
  await asUser(ana);
  await send("cy_x");
  await asUser(cy);
  expect(await send("ana")).toBe("friends");
  expect(usernames((await overview()).friends)).toEqual(["ana"]);
  await asUser(ana);
  await new Promise((r) => setTimeout(r, 2100));
  await send("dee");
  const [request] = (await overview()).outgoing;
  await asUser(dee);
  await expect(
    db.query("select public.cancel_friend_request($1)", [request.id]),
  ).rejects.toThrow("unavailable");
  await asUser(ana);
  await db.query("select public.cancel_friend_request($1)", [request.id]);
  expect((await overview()).outgoing).toEqual([]);
});
it("lets only the recipient answer, and declining makes no friendship", async () => {
  await asUser(ana);
  await send("ben");
  await asUser(ana);
  const [mine] = (await overview()).outgoing;
  await expect(
    db.query("select public.respond_friend_request($1,true)", [mine.id]),
  ).rejects.toThrow("unavailable");
  await asUser(ben);
  await db.query("select public.respond_friend_request($1,false)", [mine.id]);
  expect((await overview()).friends).toEqual([]);
});
it("hides unknown names and blocks behind the same answer, still counting the attempt", async () => {
  await asUser(ben);
  await db.query("select public.block_user($1)", [ana]);
  await asUser(ana);
  expect(await send("ben")).toBe("unavailable");
  await new Promise((r) => setTimeout(r, 2100));
  expect(await send("nobody_here")).toBe("unavailable");
  await new Promise((r) => setTimeout(r, 2100));
  expect(await send("ana")).toBe("unavailable");
  await db.exec("reset role");
  expect(
    (
      await db.query(
        "select * from public.friend_request_log where user_id=$1",
        [ana],
      )
    ).rows,
  ).toHaveLength(3);
});
it("blocking removes friendship and requests both ways; unblocking does not restore them", async () => {
  await asUser(ana);
  await send("ben");
  await asUser(ben);
  await db.query("select public.respond_friend_request($1,true)", [
    (await overview()).incoming[0].id,
  ]);
  await asUser(ana);
  await db.query("select public.block_user($1)", [ben]);
  expect((await overview()).friends).toEqual([]);
  expect(usernames((await overview()).blocked)).toEqual(["ben"]);
  await asUser(ben);
  expect((await overview()).friends).toEqual([]);
  await asUser(ana);
  await db.query("select public.unblock_user($1)", [ben]);
  expect((await overview()).blocked).toEqual([]);
  expect((await overview()).friends).toEqual([]);
});
it("rate-limits requests: one per 2 seconds and 20 per day", async () => {
  await asUser(ana);
  await send("ben");
  await expect(send("cy_x")).rejects.toThrow("slow_down");
  await db.exec("reset role");
  await db.query(
    "insert into public.friend_request_log(user_id, sent_at) select $1, now() - interval '1 hour' from generate_series(1,20)",
    [ana],
  );
  await asUser(ana);
  await new Promise((r) => setTimeout(r, 2100));
  await expect(send("cy_x")).rejects.toThrow("slow_down");
});
it("lets friends see each other's profiles and lists mutual friends", async () => {
  await asUser(ana);
  expect(
    (await db.query("select username from public.profiles where id=$1", [cy]))
      .rows,
  ).toEqual([]);
  await db.exec("reset role");
  await db.query(
    "insert into public.friendships(user_a,user_b) values (least($1::uuid,$2::uuid),greatest($1::uuid,$2::uuid)), (least($1::uuid,$3::uuid),greatest($1::uuid,$3::uuid)), (least($2::uuid,$3::uuid),greatest($2::uuid,$3::uuid))",
    [ana, ben, cy],
  );
  await asUser(ana);
  expect(
    (
      await db.query<{ username: string }>(
        "select username from public.profiles where id=$1",
        [cy],
      )
    ).rows[0].username,
  ).toBe("cy_x");
  const mutual = (
    await db.query<{ m: { username: string }[] }>(
      "select public.mutual_friends($1) m",
      [ben],
    )
  ).rows[0].m;
  expect(usernames(mutual)).toEqual(["cy_x"]);
  // A stranger's mutual friends stay private.
  expect(
    (
      await db.query<{ m: unknown[] }>("select public.mutual_friends($1) m", [
        dee,
      ])
    ).rows[0].m,
  ).toEqual([]);
  await expect(db.query("select * from public.friendships")).rejects.toThrow();
});
