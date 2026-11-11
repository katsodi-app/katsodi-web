import { CreateRoom } from "@/components/create-room";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ fandom?: string; format?: string }>;
}) {
  const { fandom, format } = await searchParams;
  return (
    <CreateRoom
      initialFandom={fandom}
      initialFormat={format === "music" ? "music" : "video"}
    />
  );
}
