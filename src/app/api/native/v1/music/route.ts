import { musicLibraryData } from "@/lib/server/music-discovery";
import { musicLibraryView } from "@/lib/music-library-view";
import { nativeOk, nativeRoute } from "@/lib/server/native-api";
export const runtime = "nodejs";

/**
 * The music library as the website shows it: the all-time chart, the
 * popular and trending collections and the providers' charts (bundled
 * snapshots, refreshed from the server when available). Public.
 */
export async function GET(request: Request) {
  return nativeRoute(request, "optional", async (requestId) =>
    nativeOk(musicLibraryView(await musicLibraryData()), requestId),
  );
}
