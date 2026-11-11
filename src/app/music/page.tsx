import type { Metadata } from "next";
import { MusicLibrary } from "@/components/music-library";
import { musicLibraryData } from "@/lib/server/music-discovery";
import { musicLibraryView } from "@/lib/music-library-view";

export const metadata: Metadata = { title: "Music · Katsodi" };

export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; collection?: string }>;
}) {
  const params = await searchParams;
  return (
    <MusicLibrary
      key={`${params.collection || ""}:${params.q || ""}`}
      {...musicLibraryView(await musicLibraryData())}
      initialQuery={params.q?.slice(0, 200)}
      initialCollection={params.collection}
    />
  );
}
