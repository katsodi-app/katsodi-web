import { randomBytes } from "node:crypto";
import {
  nativePlayerHeaders,
  nativePlayerPage,
} from "@/lib/server/native-player-page";
export const runtime = "nodejs";

/**
 * Provider-only page for the desktop client's player helper: one official
 * embed and its control surface, nothing of Katsodi. Public, uncached, no
 * cookies or tokens read; a fresh nonce gates the only inline script.
 */
export async function GET() {
  const nonce = randomBytes(18).toString("base64");
  return new Response(nativePlayerPage(nonce), {
    headers: nativePlayerHeaders(nonce),
  });
}
