import { setDemoAnnotations } from "@/lib/server/room-actions";
import { demoSwitchRoute } from "@/lib/server/native-demo";
export const runtime = "nodejs";

/**
 * Hosts: `{ "open": true | false }` lets every member of a running demo send
 * data on the demo channel (drawing on the website; in the desktop shared
 * browser, clicks and keys for the presenter, who still decides whose input
 * to apply). The demo token carries the grant, so clients reconnect.
 */
export const POST = demoSwitchRoute(setDemoAnnotations, "open");
