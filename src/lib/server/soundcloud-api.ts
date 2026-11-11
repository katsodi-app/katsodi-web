// Official SoundCloud client-credentials API. Credentials and tokens stay server-side.
import { musicRoomSource } from "@/lib/music-discovery";
export type SoundcloudTrack = {
  id?: string | number;
  title?: string;
  permalink_url?: string;
  artwork_url?: string | null;
  playback_count?: number;
  sharing?: string;
  public?: boolean;
  user?: { username?: string };
};
type Resource = {
  kind?: string;
  sharing?: string;
  tracks?: SoundcloudTrack[];
  collection?: SoundcloudTrack[];
  track_count?: number;
};
let cached: { token: string; until: number } | null = null;
let pending: Promise<string> | null = null;
async function accessToken() {
  const id = process.env.SOUNDCLOUD_CLIENT_ID,
    secret = process.env.SOUNDCLOUD_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (cached && cached.until > Date.now()) return cached.token;
  if (!pending)
    pending = (async () => {
      const response = await fetch(
        "https://secure.soundcloud.com/oauth/token",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=client_credentials",
          signal: AbortSignal.timeout(15000),
          cache: "no-store",
          redirect: "error",
        },
      );
      if (!response.ok) throw Error("soundcloud_auth_unavailable");
      const data = await response.json();
      if (typeof data.access_token !== "string")
        throw Error("soundcloud_auth_unavailable");
      cached = {
        token: data.access_token,
        until:
          Date.now() + Math.max(0, Number(data.expires_in || 3600) - 60) * 1000,
      };
      return cached.token;
    })().finally(() => {
      pending = null;
    });
  return pending;
}
async function request(path: string, token: string): Promise<Resource> {
  let url = new URL(path, "https://api.soundcloud.com");
  for (let redirects = 0; redirects < 3; redirects++) {
    if (
      url.origin !== "https://api.soundcloud.com" ||
      url.username ||
      url.password
    )
      throw Error("invalid_soundcloud_url");
    const response = await fetch(url, {
      headers: { Authorization: `OAuth ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
      redirect: "manual",
      cache: "no-store",
    });
    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.get("location")
    ) {
      url = new URL(response.headers.get("location")!, url);
      continue;
    }
    if (!response.ok)
      throw Error(
        response.status === 404 || response.status === 403
          ? "notFound"
          : "failed",
      );
    return (await response.json()) as Resource;
  }
  throw Error("soundcloud_redirect_limit");
}
export async function soundcloudPlaylist(
  url: string,
): Promise<{ tracks: SoundcloudTrack[]; capped: boolean } | null> {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    !["soundcloud.com", "www.soundcloud.com", "m.soundcloud.com"].includes(
      parsed.hostname,
    ) ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    !/^\/[^/]+\/sets\/[^/]+\/?$/.test(parsed.pathname)
  )
    throw Error("unsupported");
  const token = await accessToken();
  if (!token) return null;
  const playlist = await request(
    `/resolve?url=${encodeURIComponent(parsed.href)}`,
    token,
  );
  if (
    playlist.kind !== "playlist" ||
    playlist.sharing !== "public" ||
    !Array.isArray(playlist.tracks)
  )
    throw Error("notFound");
  const initial = playlist.tracks.slice(0, 300);
  const details = new Map<string, SoundcloudTrack>();
  const incomplete = initial.filter(
    (track) => track.id && !track.permalink_url,
  );
  for (let offset = 0; offset < incomplete.length; offset += 50) {
    const ids = incomplete
      .slice(offset, offset + 50)
      .map((track) => track.id)
      .join(",");
    const result = await request(
      `/tracks?ids=${encodeURIComponent(ids)}&limit=50&linked_partitioning=true`,
      token,
    );
    const rows = Array.isArray(result)
      ? (result as SoundcloudTrack[])
      : result.collection || [];
    rows.forEach((track) => details.set(String(track.id), track));
  }
  const tracks = initial
    .map((track) =>
      track.permalink_url ? track : details.get(String(track.id)),
    )
    .filter(
      (track): track is SoundcloudTrack =>
        !!track &&
        (track.sharing === "public" || track.public === true) &&
        !!track.permalink_url &&
        !!musicRoomSource(track.permalink_url),
    );
  return {
    tracks,
    capped: (playlist.track_count || playlist.tracks.length) > 300,
  };
}
