import { pauseDemo } from "@/lib/server/room-actions";
import { demoSwitchRoute } from "@/lib/server/native-demo";
export const runtime = "nodejs";

/** Hosts: `{ "paused": true | false }` stops or resumes a running demo. */
export const POST = demoSwitchRoute(pauseDemo, "paused");
