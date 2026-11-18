import { supabaseConfig } from "@/lib/supabase/config";
import { voiceConfig } from "@/lib/server/voice";
import {
  NATIVE_API_VERSION,
  nativeOk,
  nativeRoute,
} from "@/lib/server/native-api";
export const runtime = "nodejs";

/**
 * Public bootstrap for the native client: API version, server time (for
 * clock offset estimates) and the public Supabase project identifiers the
 * client needs to sign in. Only NEXT_PUBLIC values; never a secret.
 */
export async function GET(request: Request) {
  return nativeRoute(request, "optional", async (requestId) => {
    const supabase = supabaseConfig();
    return nativeOk(
      {
        apiVersion: NATIVE_API_VERSION,
        minimumClientVersion: null,
        serverTime: new Date().toISOString(),
        supabase: supabase
          ? { url: supabase.url, publishableKey: supabase.key }
          : null,
        features: { voice: voiceConfig() !== null },
      },
      requestId,
    );
  });
}
