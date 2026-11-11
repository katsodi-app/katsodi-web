import { vkEmbed, vkVideoId } from "../providers";
import type { PlayerResolution } from "../player";

const API = "https://api.vk.com/method/video.get";
const VERSION = "5.199";
const required = {
  kind: "external",
  reason: "vkEmbedRequired",
  sync: false,
} as const satisfies PlayerResolution;

/** True when the server can ask VK's official API for embed players. */
export const vkApiConfigured = () => !!process.env.VK_ACCESS_TOKEN?.trim();

/**
 * Finds VK's own embed player for a plain VK video link through the official
 * video.get method, which returns the video's `player` URL. Only a VK
 * video_ext.php player with a hash is accepted. Without VK_ACCESS_TOKEN, or
 * when VK refuses (private video, embedding disabled, bad token), the room
 * asks for VK's export code instead. VK pages themselves are never fetched.
 */
export async function vkApiPlayer(input: string): Promise<PlayerResolution> {
  const token = process.env.VK_ACCESS_TOKEN?.trim();
  let video: string | null = null;
  try {
    video = vkVideoId(new URL(input));
  } catch {
    return required;
  }
  if (!video || !token) return required;
  try {
    const response = await fetch(API, {
      method: "POST",
      body: new URLSearchParams({
        videos: video,
        count: "1",
        access_token: token,
        v: VERSION,
      }),
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return required;
    const data = (await response.json()) as {
      response?: { items?: { player?: unknown }[] };
      error?: { error_code?: unknown };
    };
    // Log only VK's numeric code: the error body echoes request parameters.
    if (data.error)
      console.warn(`VK video.get error ${Number(data.error.error_code) || 0}`);
    const player = data.response?.items?.[0]?.player;
    if (typeof player !== "string") return required;
    const src = vkEmbed(new URL(player));
    return src
      ? {
          kind: "iframe",
          src,
          provider: "VK Видео",
          presentation: "discovered",
          sync: false,
        }
      : required;
  } catch {
    return required;
  }
}
