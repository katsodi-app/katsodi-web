import { notFound } from "next/navigation";
import { fandoms } from "@/lib/fandoms";
import { FandomDetail } from "@/components/community-pages";
import { publicFandomRooms } from "@/lib/server/fandom-rooms";
import { communityFandom } from "@/lib/server/community-fandoms";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Catalogue fandoms, or community fandoms approved from requests.
  const community = fandoms.some((f) => f.id === slug)
    ? null
    : await communityFandom(slug);
  if (!community && !fandoms.some((f) => f.id === slug)) notFound();
  return (
    <FandomDetail
      id={slug}
      community={community}
      roomsResult={await publicFandomRooms(slug)}
    />
  );
}
