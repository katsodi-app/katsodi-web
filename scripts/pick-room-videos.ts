// Picks each fandom room's starting video with the app's own video search
// (YouTube results page, no key) and writes supabase/seed/bots/videos.mjs.
//   npx tsx scripts/pick-room-videos.ts
// Rule: the first result between 1 and 30 minutes that is not live. The file
// keeps each pick's title and channel, to be reviewed before seeding.
import { writeFileSync } from "node:fs";
import { searchVideos, type VideoHit } from "../src/lib/server/video-search";
import meta from "../supabase/seed/bots/rooms-meta.mjs";

type Pick = { url: string; title: string; author: string };
const pick = (hits: VideoHit[]) =>
  hits.find((h) => h.source === "youtube" && !h.live && h.duration >= 60 && h.duration <= 1800);

async function main() {
const out: Record<string, { en?: Pick; ru?: Pick }> = {};
for (const room of meta as { fandom: string; video: string[] }[]) {
  const [en, ru] = room.video;
  const entry: { en?: Pick; ru?: Pick } = {};
  for (const [lang, query] of [["en", en], ["ru", ru]] as const) {
    if (!query) continue;
    // Gently: YouTube stops answering a burst of searches.
    let hit = pick(await searchVideos(query));
    await new Promise((r) => setTimeout(r, 4000));
    if (!hit) {
      await new Promise((r) => setTimeout(r, 15000));
      hit = pick(await searchVideos(query + " video"));
    }
    if (hit) entry[lang] = { url: hit.url, title: hit.title, author: hit.author };
    console.log(`${room.fandom} ${lang}: ${hit ? `${hit.title} — ${hit.author}` : "NOTHING"}`);
  }
  out[room.fandom] = entry;
}
writeFileSync(
  "supabase/seed/bots/videos.mjs",
  "// Starting videos of the fandom rooms (scripts/pick-room-videos.ts; reviewed by hand).\n" +
    "const videos = " + JSON.stringify(out, null, 2) + ";\nexport default videos;\n",
);
}
void main();
