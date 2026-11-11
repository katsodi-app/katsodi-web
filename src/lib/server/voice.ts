import {
  AccessToken,
  RoomServiceClient,
  TrackSource,
} from "livekit-server-sdk";
import { createClient } from "@supabase/supabase-js";
export function voiceConfig() {
  const {
    VOICE_ENABLED,
    LIVEKIT_URL: url,
    LIVEKIT_API_KEY: key,
    LIVEKIT_API_SECRET: secret,
    SUPABASE_SERVICE_ROLE_KEY: admin,
    VOICE_WORKER_SECRET: worker,
  } = process.env;
  if (
    VOICE_ENABLED !== "true" ||
    !url ||
    !key ||
    !secret ||
    !admin ||
    !worker ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL
  )
    return null;
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "wss:" ||
      !parsed.hostname.endsWith(".livekit.cloud") ||
      parsed.username ||
      parsed.password
    )
      return null;
  } catch {
    return null;
  }
  return { url, key, secret, admin, worker };
}
export const voiceRoomName = (room: string) => `katsodi-${room}`;
/** A separate SFU room for link demos, so they never collide with voice. */
export const screenRoomName = (room: string) => `katsodi-${room}-screen`;
/**
 * Link demos: only the current demo's sharer may publish a screen (and its
 * audio); only hosts may send drawing and click-hint data; everyone may
 * watch. Short-lived like the voice token.
 */
export async function demoToken(
  room: string,
  identity: string,
  rights: { publish: boolean; data: boolean },
) {
  const config = voiceConfig();
  if (!config) throw Error("unconfigured");
  const token = new AccessToken(config.key, config.secret, {
    identity,
    ttl: 60,
  });
  token.addGrant({
    roomJoin: true,
    room: screenRoomName(room),
    canPublish: rights.publish,
    canSubscribe: true,
    canPublishData: rights.data,
    canPublishSources: rights.publish
      ? [TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO]
      : [],
  });
  return { url: config.url, token: await token.toJwt() };
}
export async function voiceToken(room: string, identity: string) {
  const config = voiceConfig();
  if (!config) throw Error("unconfigured");
  const token = new AccessToken(config.key, config.secret, {
    identity,
    ttl: 60,
  });
  token.addGrant({
    roomJoin: true,
    room: voiceRoomName(room),
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
    canPublishSources: [TrackSource.MICROPHONE],
  });
  return { url: config.url, token: await token.toJwt() };
}
// Triggered by a trusted scheduler. Failed jobs remain durable for the next run.
export async function drainVoiceRevocations() {
  const config = voiceConfig();
  if (!config) throw Error("unconfigured");
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    config.admin,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(8000) }),
      },
    },
  );
  const jobs = await admin
    .from("voice_revocations")
    .select("id,room_id,user_id")
    .order("id")
    .limit(100);
  if (jobs.error) throw Error("queue_unavailable");
  const sfu = new RoomServiceClient(
    config.url.replace(/^wss:/, "https:"),
    config.key,
    config.secret,
    { requestTimeout: 8, failover: false },
  );
  const deadline = Date.now() + 20000;
  for (const job of jobs.data || []) {
    if (Date.now() > deadline) throw Error("queue_backlog");
    // Voice and screen sharing are separate SFU rooms; revoke both.
    for (const name of [
      voiceRoomName(job.room_id),
      screenRoomName(job.room_id),
    ]) {
      try {
        if (job.user_id) await sfu.removeParticipant(name, job.user_id);
        else await sfu.deleteRoom(name);
      } catch (error) {
        // A departed participant/finished room already satisfies the revocation.
        if (
          !error ||
          typeof error !== "object" ||
          !("code" in error) ||
          error.code !== "not_found"
        )
          throw Error("sfu_unavailable");
      }
    }
    const removed = await admin
      .from("voice_revocations")
      .delete()
      .eq("id", job.id);
    if (removed.error) throw Error("queue_unavailable");
  }
  // Do not advertise readiness with a backlog: new joins wait until all jobs drain.
  if ((jobs.data?.length || 0) >= 100) throw Error("queue_backlog");
  await sfu.listRooms();
  const beat = await admin
    .from("voice_worker_state")
    .upsert({ id: true, last_seen: new Date().toISOString() });
  if (beat.error) throw Error("queue_unavailable");
}
