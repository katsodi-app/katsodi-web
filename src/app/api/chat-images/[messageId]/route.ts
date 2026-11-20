import { uuid } from "@/lib/server/contracts";
import { readChatImage } from "@/lib/server/chat-image-store";
export const runtime = "nodejs";
const unavailable = () =>
  Response.json(
    { error: "unavailable" },
    { status: 404, headers: { "Cache-Control": "private, no-store" } },
  );
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const { messageId } = await params;
  if (!uuid.safeParse(messageId).success) return unavailable();
  try {
    const image = await readChatImage(messageId);
    if (!image) return unavailable();
    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": 'inline; filename="chat-image.webp"',
      },
    });
  } catch {
    return unavailable();
  }
}
