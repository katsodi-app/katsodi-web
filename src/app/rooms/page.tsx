import { RoomList } from "@/components/room-list";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ format?: string }>;
}) {
  const { format } = await searchParams;
  return <RoomList initialFormat={format} />;
}
