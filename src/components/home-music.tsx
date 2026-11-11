"use client";
import Link from "next/link";
import { ArrowUpRight, AudioLines, Headphones } from "lucide-react";
import { useLocale } from "./workspace-provider";
import { assets } from "@/data/editorial";
import { EditorialImage } from "./editorial-image";

export function HomeMusic() {
  const { t } = useLocale();
  const m = t.platformUX;
  return (
    <section className="home-music-feature" aria-labelledby="home-music-title">
      <div className="home-music-copy">
        <p className="eyebrow">
          <AudioLines size={17} />
          {m.musicEyebrow}
        </p>
        <h2 id="home-music-title">{m.musicTitle}</h2>
        <p>{m.musicHint}</p>
        <div className="home-music-actions">
          <Link className="button button-primary" href="/music">
            {m.musicExplore}
            <ArrowUpRight size={17} />
          </Link>
          <Link className="text-link" href="/network/create?format=music">
            <Headphones size={17} />
            {m.musicRoom}
          </Link>
        </div>
      </div>
      <div className="home-music-art">
        <EditorialImage
          asset={assets.vinyl}
          sizes="(max-width: 700px) 90vw, 40vw"
        />
        <span className="home-music-caption">{m.musicCaption}</span>
      </div>
    </section>
  );
}
