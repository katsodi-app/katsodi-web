import { z } from "zod";

/** A room's link demo, as members read it (see migration 1800). */
export const demoRecord = z.object({
  user_id: z.string().uuid(),
  url: z.string().url(),
  status: z.enum(["pending", "live", "paused"]),
  requested_at: z.string(),
  decided_by: z.string().uuid().nullable(),
  paused_by: z.string().uuid().nullable(),
  seen_at: z.string(),
  /** Hosts let everyone annotate (migration 2100); false before it. */
  annotations_open: z.boolean().optional(),
});
export type RoomDemo = z.infer<typeof demoRecord>;

/**
 * Same rule as private.demo_current: a request waits ten minutes; a running
 * demo lasts while its sharer confirms it at least once a minute.
 */
export function demoCurrent(demo: RoomDemo, now = Date.now()) {
  return demo.status === "pending"
    ? now - Date.parse(demo.requested_at) < 10 * 60000
    : now - Date.parse(demo.seen_at) < 60000;
}

/**
 * Whether this browser can present a demo (share its screen). Mobile
 * browsers (iOS Safari, Android Chrome) do not offer screen capture to
 * websites, so phones can watch and moderate demos but not present.
 */
export function canPresentDemo() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function"
  );
}
