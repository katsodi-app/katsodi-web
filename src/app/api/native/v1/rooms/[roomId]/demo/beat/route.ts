import { beatDemo } from "@/lib/server/room-actions";
import { demoSwitchRoute } from "@/lib/server/native-demo";
export const runtime = "nodejs";

/**
 * The presenter confirms its running demo every ~20 s; a demo without a
 * confirmation for a minute is over. A refusal means it was ended.
 */
export const POST = demoSwitchRoute(beatDemo);
