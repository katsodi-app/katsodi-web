import { NextResponse } from "next/server";
import { inviteTokenSchema } from "@/lib/server/contracts";
import { redirectOrigin } from "@/lib/server/app-origin";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const valid = inviteTokenSchema.safeParse(token);
  return NextResponse.redirect(
    new URL(
      valid.success ? `/join#${encodeURIComponent(valid.data)}` : "/join",
      redirectOrigin(request),
    ),
    {
      status: 307,
      headers: {
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}
