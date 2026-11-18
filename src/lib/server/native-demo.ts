import "server-only";
import type { ActionResult } from "@/lib/server/contracts";
import { initialResult } from "@/lib/server/contracts";
import {
  actionErrorCode,
  formFrom,
  nativeError,
  nativeOk,
  nativeRoute,
  readJsonObject,
} from "@/lib/server/native-api";

type Action = (prev: ActionResult, form: FormData) => Promise<ActionResult>;

/**
 * A native demo route with one boolean field (`accept`, `paused`) or none,
 * mapped onto the website's form action ("1"/"0") for that field.
 */
export function demoSwitchRoute(action: Action, field?: string) {
  return (
    request: Request,
    { params }: { params: Promise<{ roomId: string }> },
  ) =>
    nativeRoute(request, "required", async (requestId) => {
      const { roomId } = await params;
      const fields: Record<string, string> = { room: roomId };
      if (field) {
        const body = await readJsonObject(request);
        const keys = Object.keys(body);
        if (
          keys.length !== 1 ||
          keys[0] !== field ||
          typeof body[field] !== "boolean"
        )
          return nativeError("invalid_request", requestId);
        fields[field] = body[field] ? "1" : "0";
      }
      const result = await action(initialResult, formFrom(fields));
      return result.status === "success"
        ? nativeOk({ ok: true }, requestId)
        : nativeError(actionErrorCode(result), requestId);
    });
}
