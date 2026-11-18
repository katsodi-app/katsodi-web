import { decideDemo } from "@/lib/server/room-actions";
import { demoSwitchRoute } from "@/lib/server/native-demo";
export const runtime = "nodejs";

/** Hosts: `{ "accept": true | false }` for a waiting demo request. */
export const POST = demoSwitchRoute(decideDemo, "accept");
