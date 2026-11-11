import { currentAccount } from "@/lib/supabase/server";
import { uuid } from "@/lib/server/contracts";
import { CHAT_IMAGE_BUCKET, MAX_IMAGE_OUTPUT } from "@/lib/chat-media";
import { prepareChatImage } from "@/lib/server/chat-images";
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
    const { client, user } = await currentAccount();
    if (!client || !user) return unavailable();
    // RLS checks current membership on every request, including after a kick.
    const message = await client
      .from("room_messages")
      .select("image_path")
      .eq("id", messageId)
      .eq("kind", "image")
      .maybeSingle();
    if (message.error || !message.data?.image_path) return unavailable();
    const file = await client.storage
      .from(CHAT_IMAGE_BUCKET)
      .download(message.data.image_path);
    if (file.error || !file.data || file.data.size > MAX_IMAGE_OUTPUT)
      return unavailable();
    // Even files uploaded outside our form must decode as a safe raster image.
    const image = await prepareChatImage(
      new Uint8Array(await file.data.arrayBuffer()),
    );
    return new Response(new Uint8Array(image.data), {
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
