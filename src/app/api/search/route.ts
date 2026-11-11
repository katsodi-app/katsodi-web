import { musicLibraryData } from "@/lib/server/music-discovery";
import { communityFandoms } from "@/lib/server/community-fandoms";
import { currentViewer } from "@/lib/supabase/server";
import { matchesSearch, searchText, type SearchResult } from "@/lib/search";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const filter = url.searchParams.get("filter") || "all";
  const headers = { "Cache-Control": "private, no-store" };
  if (
    query.length > 200 ||
    !["all", "rooms", "fandoms", "music"].includes(filter)
  )
    return Response.json({ error: "invalid" }, { status: 400, headers });
  const results: SearchResult[] = [];
  let partial = false;
  const jobs: Promise<void>[] = [];
  if (filter === "all" || filter === "music")
    jobs.push(
      (async () => {
        const data = await musicLibraryData();
        const seen = new Set<string>();
        const add = (item: SearchResult) => {
          const identity = searchText(`${item.title} ${item.subtitle}`);
          if (
            seen.has(identity) ||
            !matchesSearch(query, item.title, item.subtitle)
          )
            return;
          seen.add(identity);
          results.push(item);
        };
        data.chart.tracks.forEach((track) =>
          add({
            id: `spotify:${track.spotifyId}`,
            type: "music",
            title: track.title,
            subtitle: track.artists.join(", "),
            href: `/music/${track.slug}`,
            art: track.thumb,
          }),
        );
        for (const [collection, tracks] of [
          ["soundcloud", data.collections.popular.tracks],
          ["trending", data.collections.trending.tracks],
          ...data.charts
            .filter((c) => c.provider === "spotify" || c.provider === "youtube")
            .map((c) => [c.provider, c.tracks] as const),
        ] as const)
          tracks.forEach((track) =>
            add({
              id: track.id,
              type: "music",
              title: track.title,
              subtitle: track.artists.join(", "),
              href: `/music?collection=${collection}&q=${encodeURIComponent(track.title)}`,
              art: track.cover || undefined,
            }),
          );
      })(),
    );
  if (filter === "all" || filter === "fandoms")
    jobs.push(
      (async () => {
        for (const fandom of await communityFandoms()) {
          if (matchesSearch(query, fandom.name, fandom.description))
            results.push({
              id: fandom.id,
              type: "fandom",
              title: fandom.name,
              subtitle: fandom.description || "",
              href: `/fandoms/${fandom.id}`,
            });
        }
      })(),
    );
  if (filter === "all" || filter === "rooms")
    jobs.push(
      (async () => {
        const { client } = await currentViewer();
        if (!client) return;
        // Only public open rooms. RLS remains enforced, with no service-role client.
        const { data, error } = await client
          .from("rooms")
          .select("id,name,description,fandom_id")
          .eq("visibility", "public")
          .is("closed_at", null)
          .order("created_at", { ascending: false })
          .limit(500)
          .abortSignal(AbortSignal.timeout(4000));
        if (error) {
          partial = true;
          return;
        }
        for (const room of data || [])
          if (matchesSearch(query, room.name, room.description))
            results.push({
              id: room.id,
              type: "room",
              title: room.name,
              subtitle: room.description,
              href: `/room/${room.id}`,
              fandomId: room.fandom_id,
            });
      })(),
    );
  const settled = await Promise.allSettled(jobs);
  if (settled.some((job) => job.status === "rejected")) partial = true;
  // Bound every group independently, so a large music catalogue cannot hide rooms.
  return Response.json(
    {
      results: ["room", "music", "fandom"].flatMap((type) =>
        results
          .filter((item) => item.type === type)
          .slice(0, filter === "all" ? 8 : 30),
      ),
      partial,
    },
    { headers },
  );
}
