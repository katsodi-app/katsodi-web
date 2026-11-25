// Second pass over supabase/seed/bots/videos.mjs after review: picks from
// official channels only where the first pass took a reupload, and gives
// Russian rooms the English room's official video where theirs was a fan copy.
//   npx tsx scripts/fix-room-videos.ts
import { writeFileSync } from "node:fs";
import { searchVideos } from "../src/lib/server/video-search";
import videos from "../supabase/seed/bots/videos.mjs";

type Pick = { url: string; title: string; author: string };
const table = videos as Record<string, { en?: Pick; ru?: Pick }>;
// [fandom, query, official channel names]
const official: [string, string, RegExp][] = [
  ["sport-6", "UEFA Champions League highlights", /^(UEFA|Champions League)/i],
  ["anime-8", "Death Note anime trailer", /(VIZ|viz|Netflix|Crunchyroll|Aniplex|VAP)/],
  ["cinema-17", "Breaking Bad official trailer", /(AMC|Breaking Bad|Netflix|Sony)/],
  ["cinema-19", "Friends official trailer HBO Max", /(HBO|Max|Warner|Friends|Netflix)/],
  ["anime-9", "Fullmetal Alchemist Brotherhood official trailer", /(Crunchyroll|Aniplex|Funimation|Netflix|SQUARE ENIX)/i],
  ["sport-7", "NBA official highlights", /^NBA$/],
  ["games-12", "Honkai Star Rail official trailer English", /Honkai: Star Rail/],
];
// Russian rooms whose pick was a reupload: the English room's official video.
const useEnglish = ["anime-4", "anime-5", "cinema-5", "cinema-7", "cinema-0", "games-0", "cinema-16", "cinema-12",
                    "cinema-4", "anime-3", "sport-0", "anime-8", "cinema-17", "sport-6"];

async function main() {
  for (const [fandom, query, channel] of official) {
    const hits = await searchVideos(query);
    await new Promise((r) => setTimeout(r, 4000));
    const hit = hits.find((h) => h.source === "youtube" && !h.live && h.duration >= 30 && h.duration <= 1800 && channel.test(h.author));
    console.log(`${fandom}: ${hit ? `${hit.title} — ${hit.author}` : "no official pick, kept"}`);
    if (hit) table[fandom].en = { url: hit.url, title: hit.title, author: hit.author };
  }
  for (const fandom of useEnglish)
    if (table[fandom]?.ru && table[fandom].en) table[fandom].ru = table[fandom].en;
  writeFileSync(
    "supabase/seed/bots/videos.mjs",
    "// Starting videos of the fandom rooms (scripts/pick-room-videos.ts, then\n" +
      "// scripts/fix-room-videos.ts after review: official channels only).\n" +
      "const videos = " + JSON.stringify(table, null, 2) + ";\nexport default videos;\n",
  );
}
void main();
