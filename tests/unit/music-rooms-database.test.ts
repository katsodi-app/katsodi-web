import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Migration 2200: music rooms (track switching, playlist import, mixing,
// 10-day lifetime). Runs the real migrations on PGlite.
let db: PGlite;
const owner = "10000000-0000-4000-8000-000000000001",
  member = "10000000-0000-4000-8000-000000000002";
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
async function room(format: "video" | "music", name: string = format) {
  await asUser(owner);
  const id = (
    await db.query<{ id: string }>(
      "select public.create_room($1,'',$2,'private','','orbit') id",
      [name, format],
    )
  ).rows[0].id;
  await db.exec("reset role");
  await db.query(
    "insert into public.room_members(room_id,user_id,role) values($1,$2,'member')",
    [id, member],
  );
  return id;
}
const fails = async (sql: string, params: unknown[], code: RegExp) =>
  expect(db.query(sql, params)).rejects.toThrow(code);
const queue = async (id: string) => {
  await db.exec("reset role");
  return (
    await db.query<{ url: string }>(
      "select url from public.room_queue where room_id=$1 order by created_at, id",
      [id],
    )
  ).rows.map((r) => r.url);
};
const track = (n: string) =>
  `https://open.spotify.com/track/${n.padEnd(22, "x")}`;
// Waits out the per-person queue throttle between calls in one test.
const wait = async (seconds: number) => {
  await db.exec("reset role");
  await db.query(
    "update public.room_queue set created_at = created_at - make_interval(secs => $1)",
    [seconds],
  );
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const file of [
    "20261101000100_foundation.sql",
    "20261102000500_room_player.sql",
    "20261103000600_voice.sql",
    "20261104000900_room_playback.sql",
    "20261104001100_room_queue.sql",
    "20261106002000_room_lifecycle.sql",
    "20261108002200_music_rooms.sql",
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.exec("grant usage on schema public to service_role");
  for (const id of [owner, member])
    await db.query("insert into auth.users values($1,now())", [id]);
}, 120000);
afterAll(async () => {
  await db?.close();
});

describe("switching tracks", () => {
  it("any member switches and controls a music room; video stays host-only", async () => {
    const music = await room("music"),
      video = await room("video");
    await asUser(member);
    await db.query("select public.set_room_source($1,$2)", [music, track("a")]);
    await db.query("select public.set_room_playback($1,$2,'playing',12)", [
      music,
      track("a"),
    ]);
    await fails(
      "select public.set_room_source($1,$2)",
      [video, track("b")],
      /room_unavailable/,
    );
    await fails(
      "select public.set_room_playback($1,$2,'playing',1)",
      [video, track("b")],
      /forbidden|stale_source/,
    );
    await db.exec("reset role");
    const r = await db.query<{ url: string }>(
      "select url from public.rooms where id=$1",
      [music],
    );
    expect(r.rows[0].url).toBe(track("a"));
  });
});

describe("playlist import", () => {
  it("adds a playlist in order, music rooms only", async () => {
    const music = await room("music"),
      video = await room("video");
    await asUser(member);
    const urls = ["1", "2", "3"].map(track);
    const added = await db.query<{ n: number }>(
      "select public.add_room_queue_many($1,$2) n",
      [music, urls],
    );
    expect(added.rows[0].n).toBe(3);
    expect(await queue(music)).toEqual(urls);
    await asUser(member);
    await fails(
      "select public.add_room_queue_many($1,$2)",
      [video, urls],
      /music_only/,
    );
  });
  it("keeps what fits in the 300-track queue and rejects bad links", async () => {
    const music = await room("music", "full");
    await wait(20);
    await db.exec("reset role");
    await db.query(
      `insert into public.room_queue(room_id,url,added_by,created_at)
       select $1, 'https://example.org/'||g, $2, now() - interval '1 hour' from generate_series(1,298) g`,
      [music, owner],
    );
    await asUser(member);
    const added = await db.query<{ n: number }>(
      "select public.add_room_queue_many($1,$2) n",
      [music, ["a", "b", "c", "d"].map(track)],
    );
    expect(added.rows[0].n).toBe(2);
    expect((await queue(music)).length).toBe(300);
    await wait(20);
    await asUser(member);
    await fails(
      "select public.add_room_queue_many($1,$2)",
      [music, [track("e")]],
      /queue_full/,
    );
    const other = await room("music", "bad");
    await wait(20);
    await asUser(member);
    await fails(
      "select public.add_room_queue_many($1,$2)",
      [other, ["http://insecure.example/x"]],
      /invalid_source/,
    );
  });
  it("video rooms keep the 50-track limit", async () => {
    const video = await room("video", "fifty");
    await db.exec("reset role");
    await db.query(
      `insert into public.room_queue(room_id,url,added_by,created_at)
       select $1, 'https://example.org/'||g, $2, now() - interval '1 hour' from generate_series(1,50) g`,
      [video, owner],
    );
    await asUser(member);
    await fails(
      "select public.add_room_queue($1,$2)",
      [video, track("z")],
      /queue_full/,
    );
  });
});

describe("mixing playlists", () => {
  it("interleaves people's tracks, each in their own order; hosts only", async () => {
    const music = await room("music", "mix");
    await wait(20);
    await asUser(owner);
    await db.query("select public.add_room_queue_many($1,$2)", [
      music,
      ["a1", "a2", "a3"].map(track),
    ]);
    await asUser(member);
    await db.query("select public.add_room_queue_many($1,$2)", [
      music,
      ["b1", "b2"].map(track),
    ]);
    await asUser(member);
    await fails("select public.mix_room_queue($1)", [music], /forbidden/);
    await asUser(owner);
    await db.query("select public.mix_room_queue($1)", [music]);
    expect(await queue(music)).toEqual(
      ["a1", "b1", "a2", "b2", "a3"].map(track),
    );
  });
});

describe("lifetime", () => {
  const lifecycle = async () => {
    await db.exec("reset role");
    await db.exec("set role service_role");
    await db.query("select * from public.run_room_lifecycle()");
    await db.exec("reset role");
  };
  const emptyFor = async (id: string, minutes: number) => {
    await db.exec("reset role");
    await db.query(
      "update public.rooms set last_occupied_at = now() - make_interval(mins => $2) where id = $1",
      [id, minutes],
    );
  };
  const exists = async (id: string) => {
    await db.exec("reset role");
    const r = await db.query<{ inactive: boolean }>(
      "select inactive_at is not null inactive from public.rooms where id=$1",
      [id],
    );
    return r.rows[0] ?? null;
  };
  it("music rooms survive hours and days, and go only after 10 empty days", async () => {
    const hour = await room("music", "hour"),
      nine = await room("music", "nine"),
      eleven = await room("music", "eleven"),
      video = await room("video", "short");
    await emptyFor(hour, 60);
    await emptyFor(nine, 9 * 24 * 60);
    await emptyFor(eleven, 11 * 24 * 60);
    await emptyFor(video, 31);
    await lifecycle();
    expect(await exists(hour)).toEqual({ inactive: false });
    expect(await exists(nine)).toEqual({ inactive: false });
    expect(await exists(eleven)).toBeNull();
    expect(await exists(video)).toBeNull();
  });
});
