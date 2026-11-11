import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
it("makes rankings readable while denying public and signed-in chart writes", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role; grant usage on schema public to anon,authenticated,service_role;",
    );
    await db.exec(
      readFileSync(
        "supabase/migrations/20261108002300_music_discovery.sql",
        "utf8",
      ),
    );
    await db.exec(
      'insert into public.music_chart_snapshots(provider,payload) values (\'spotify\',\'{"provider":"spotify","tracks":[]}\');',
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      expect(
        (await db.query("select provider from public.music_chart_snapshots"))
          .rows,
      ).toHaveLength(1);
      await expect(
        db.exec("delete from public.music_chart_snapshots"),
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.exec(
          'insert into public.music_chart_snapshots(provider,payload) values (\'youtube\',\'{"provider":"youtube","tracks":[]}\')',
        ),
      ).rejects.toThrow(/permission denied/);
      await db.exec("reset role");
    }
  } finally {
    await db.close();
  }
}, 120000);

it("the owner acceptance script checks RLS and role privileges without changing snapshots", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;",
    );
    await db.exec(
      readFileSync(
        "supabase/migrations/20261108002300_music_discovery.sql",
        "utf8",
      ),
    );
    const acceptance = readFileSync(
      "supabase/tests/music_activation.sql",
      "utf8",
    );
    await db.exec(acceptance);
    expect(
      (await db.query("select * from public.music_chart_snapshots")).rows,
    ).toEqual([]);
    await db.exec(
      "grant update on public.music_chart_snapshots to authenticated;",
    );
    await expect(db.exec(acceptance)).rejects.toThrow(
      /unexpectedly has UPDATE/,
    );
    await db.exec("rollback;");
  } finally {
    await db.close();
  }
}, 120000);
