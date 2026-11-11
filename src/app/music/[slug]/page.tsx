import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MusicTrackPage } from "@/components/music-pages";
import { musicTracks } from "@/lib/music";
import { currentMusicTrack } from "@/lib/server/music-discovery";

// Weekly chart additions and the verified bundled archive remain addressable.
// Unknown slugs still return a real 404.
export const dynamic = "force-dynamic";
export const dynamicParams = true;
export function generateStaticParams() {
  return musicTracks.map((track) => ({ slug: track.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const track = (await currentMusicTrack((await params).slug))?.track;
  return track
    ? { title: `${track.title} — ${track.artists.join(", ")} · Katsodi` }
    : {};
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const data = await currentMusicTrack((await params).slug);
  if (!data) notFound();
  return <MusicTrackPage {...data} />;
}
