"use server";
import { redirect } from "next/navigation";
import type { ActionResult } from "./contracts";
import { openMusicRoom } from "./music-operations";

/** One explicit click opens a selected track in a real, access-checked music room. */
export async function listenInRoom(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const result = await openMusicRoom(form);
  if (result.status !== "opened") return result;
  redirect(`/room/${result.roomId}`);
}
