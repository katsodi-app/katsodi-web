// Server-side only: imported by server actions (room-actions.ts); it reads
// API keys from the environment, which never reach the browser bundle.
import { classifyLink } from "@/lib/music-links";
import { soundcloudPlaylist } from "./soundcloud-api";

/**
 * Turns a pasted link into the track links to queue in a music room.
 * Public playlists only, through each service's official API:
 *  - YouTube playlist (`list=`): YouTube Data API v3, key in YOUTUBE_API_KEY;
 *  - Spotify playlist or album: Spotify Web API with the client-credentials
 *    flow (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET);
 *  - public SoundCloud sets use its official client-credentials API;
 *  - single YouTube, Spotify and SoundCloud tracks queue without API keys.
 */
export const IMPORT_LIMIT = 300;
export type ImportResult =
  | { status: "ok"; urls: string[]; source: string; capped: boolean }
  | {
      status: "error";
      code: "unsupported" | "unconfigured" | "notFound" | "empty" | "failed";
      service?: "YouTube" | "Spotify" | "SoundCloud";
    };

const fail = (
  code: Extract<ImportResult, { status: "error" }>["code"],
  service?: "YouTube" | "Spotify" | "SoundCloud",
): ImportResult => ({ status: "error", code, service });

async function json(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  return {
    ok: response.ok,
    status: response.status,
    data: await response.json().catch(() => null),
  };
}

async function youtubePlaylist(id: string): Promise<ImportResult> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return fail("unconfigured", "YouTube");
  const urls: string[] = [];
  let page = "";
  do {
    const r = await json(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${encodeURIComponent(id)}&key=${encodeURIComponent(key)}${page ? `&pageToken=${encodeURIComponent(page)}` : ""}`,
    );
    if (r.status === 404) return fail("notFound", "YouTube");
    if (!r.ok || !r.data) return fail("failed", "YouTube");
    for (const item of r.data.items ?? []) {
      const video = item?.contentDetails?.videoId;
      if (typeof video === "string" && /^[A-Za-z0-9_-]{11}$/.test(video))
        urls.push(`https://www.youtube.com/watch?v=${video}`);
    }
    page = typeof r.data.nextPageToken === "string" ? r.data.nextPageToken : "";
  } while (page && urls.length < IMPORT_LIMIT);
  return urls.length
    ? {
        status: "ok",
        urls: urls.slice(0, IMPORT_LIMIT),
        source: "YouTube",
        capped: urls.length > IMPORT_LIMIT || !!page,
      }
    : fail("empty", "YouTube");
}

let spotifyToken: { value: string; until: number } | null = null;
async function spotifyAccess() {
  const id = process.env.SPOTIFY_CLIENT_ID,
    secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (spotifyToken && spotifyToken.until > Date.now())
    return spotifyToken.value;
  const r = await json("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok || typeof r.data?.access_token !== "string") return undefined;
  spotifyToken = {
    value: r.data.access_token,
    until: Date.now() + (Number(r.data.expires_in) || 3600) * 1000 - 60000,
  };
  return spotifyToken.value;
}

async function spotifyList(
  kind: "playlist" | "album",
  id: string,
): Promise<ImportResult> {
  const token = await spotifyAccess();
  if (token === null) return fail("unconfigured", "Spotify");
  if (!token) return fail("failed", "Spotify");
  const urls: string[] = [];
  let next: string | null =
    kind === "playlist"
      ? `https://api.spotify.com/v1/playlists/${id}/tracks?limit=100&fields=next,items(track(id,type))`
      : `https://api.spotify.com/v1/albums/${id}/tracks?limit=50`;
  while (next && urls.length < IMPORT_LIMIT) {
    const r = await json(next, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.status === 404 || r.status === 403)
      return fail("notFound", "Spotify");
    if (!r.ok || !r.data) return fail("failed", "Spotify");
    for (const item of r.data.items ?? []) {
      const track = kind === "playlist" ? item?.track : item;
      if (track?.type === "track" && /^[A-Za-z0-9]{22}$/.test(String(track.id)))
        urls.push(`https://open.spotify.com/track/${track.id}`);
    }
    next =
      typeof r.data.next === "string" &&
      r.data.next.startsWith("https://api.spotify.com/")
        ? r.data.next
        : null;
  }
  return urls.length
    ? {
        status: "ok",
        urls: urls.slice(0, IMPORT_LIMIT),
        source: "Spotify",
        capped: urls.length > IMPORT_LIMIT || !!next,
      }
    : fail("empty", "Spotify");
}

export async function resolveImport(input: string): Promise<ImportResult> {
  const link = classifyLink(input);
  if (!link) return fail("unsupported");
  try {
    if (link.kind === "youtube-playlist") return await youtubePlaylist(link.id);
    if (link.kind === "spotify-playlist")
      return await spotifyList("playlist", link.id);
    if (link.kind === "spotify-album")
      return await spotifyList("album", link.id);
    if (link.kind === "soundcloud-playlist") {
      const playlist = await soundcloudPlaylist(link.url.href);
      if (!playlist) return fail("unconfigured", "SoundCloud");
      const urls = playlist.tracks.map((track) => track.permalink_url!);
      return urls.length
        ? { status: "ok", urls, source: "SoundCloud", capped: playlist.capped }
        : fail("empty", "SoundCloud");
    }
    return {
      status: "ok",
      urls: [link.url.toString()],
      source: link.url.hostname,
      capped: false,
    };
  } catch {
    return fail("failed");
  }
}
