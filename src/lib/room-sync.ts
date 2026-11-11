import type { RoomSnapshot } from "@/lib/server/network-data";

/**
 * Applies a polled room response to the snapshot already on screen.
 * A full response replaces it. A delta response (with messageIds) carries only
 * new rows plus the ordered id window: rows are reused from the previous
 * snapshot, and ids missing from the window (deleted or scrolled out) drop.
 * Returns null when the delta cannot be applied, so the caller refetches fully.
 */
export function mergeRoomSnapshot(
  previous: RoomSnapshot | null,
  next: RoomSnapshot,
): RoomSnapshot | null {
  if (!next.messageIds) return next;
  if (!previous) return null;
  const known = new Map(
    [...previous.messages, ...next.messages].map((message) => [
      message.id,
      message,
    ]),
  );
  const messages = next.messageIds.map((id) => known.get(id));
  if (messages.some((message) => !message)) return null;
  const merged: RoomSnapshot = {
    ...next,
    messages: messages as RoomSnapshot["messages"],
  };
  delete merged.messageIds;
  return merged;
}

/** True when a scroll container is within `slack` px of its bottom edge. */
export function nearBottom(element: HTMLElement, slack = 80) {
  return (
    element.scrollHeight - element.scrollTop - element.clientHeight <= slack
  );
}
