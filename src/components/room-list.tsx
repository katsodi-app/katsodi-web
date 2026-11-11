"use client";
import { matchesSearch } from "@/lib/search";
import { useState } from "react";
import { HomeMusic } from "./home-music";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Film,
  Headphones,
  Plus,
  Search,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { RoomCard } from "./room-card";
import { SourceChecker } from "./source-checker";
import { HeroCarousel } from "./hero-carousel";
import { HomeFandoms, MusicCollection } from "./home-collections";
import { PageIntro } from "./page-design";
import { HomeQuickLinks } from "./welcome-page";
import { Empty } from "./state-screens";

export function RoomList({
  home = false,
  saved = false,
  initialFormat = "all",
}: {
  home?: boolean;
  saved?: boolean;
  initialFormat?: string;
}) {
  const { t, state, ready } = useWorkspace();
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState(
    ["music", "video"].includes(initialFormat) ? initialFormat : "all",
  );
  const rooms = state.rooms.filter(
    (room) =>
      (saved ? state.saved.includes(room.id) : room.visibility === "public") &&
      (format === "all" || room.format === format) &&
      matchesSearch(query, room.name, room.description),
  );
  return (
    <>
      {home ? (
        <div className="page-heading home-heading">
          <div>
            <p className="eyebrow">
              {home ? t.yourSpace : saved ? t.collection : t.catalog}
            </p>
            <h1>
              {home ? t.greeting : saved ? t.saved : t.rooms}
              <span className="lime">{home ? "" : "."}</span>
            </h1>
            {!home && <p>{saved ? t.savedIntro : t.roomsHint}</p>}
          </div>
          {home && <p className="heading-intro">{t.intro}</p>}
        </div>
      ) : (
        <PageIntro
          eyebrow={saved ? t.design.collectionEyebrow : t.design.roomsEyebrow}
          title={saved ? t.saved : t.rooms}
          description={saved ? t.savedIntro : t.design.draftsHint}
          motif={saved ? "saved" : "rooms"}
        >
          <Link
            href={saved ? "/fandoms" : "/network"}
            className="button button-primary"
          >
            {saved ? t.design.discoverFandoms : t.network.catalog}
            <ArrowUpRight size={16} />
          </Link>
          {!saved && (
            <Link href="/rooms/create" className="text-link">
              {t.saveDraft}
              <Plus size={15} />
            </Link>
          )}
        </PageIntro>
      )}
      {home && (
        <>
          <HeroCarousel />
          <HomeQuickLinks />
          <HomeMusic />
          <HomeFandoms />
        </>
      )}
      <Link href="/network" className="text-link network-entry">
        {t.network.catalog}
        <ArrowUpRight size={16} />
      </Link>
      <section className="rooms-section">
        <div className="section-heading">
          <div>
            <h2>{home ? t.discover : saved ? t.saved : t.seeAll}</h2>
            {home && <p>{t.roomsHint}</p>}
          </div>
          {home && (
            <Link className="text-link" href="/rooms">
              {t.seeAll}
              <ArrowRight size={17} />
            </Link>
          )}
        </div>
        <div className="filter-bar">
          <div className="chips">
            {(["all", "video", "music"] as const).map((key) => (
              <button
                className={`chip ${format === key ? "active" : ""}`}
                key={key}
                onClick={() => setFormat(key)}
                aria-pressed={format === key}
              >
                {key === "video" ? (
                  <Film size={15} />
                ) : key === "music" ? (
                  <Headphones size={15} />
                ) : (
                  <Compass size={15} />
                )}{" "}
                {t[key]}
              </button>
            ))}
          </div>
          <label className="search-box">
            <Search size={17} />
            <span className="sr-only">{t.search}</span>
            <input
              placeholder={t.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        {!ready ? (
          <p role="status">{t.loading}</p>
        ) : rooms.length ? (
          <div className="room-grid">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        ) : (
          <Empty
            title={saved ? t.noSaved : t.noResults}
            description={saved ? t.noSavedHint : t.noResultsHint}
            href={saved ? "/rooms" : undefined}
            action={saved ? t.seeAll : undefined}
          />
        )}
      </section>
      {home && (
        <>
          <MusicCollection />
          <SourceChecker />
        </>
      )}
    </>
  );
}
