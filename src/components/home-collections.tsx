"use client";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Headphones, Users } from "lucide-react";
import { featuredFandoms } from "@/data/editorial";
import { FandomCard } from "./fandom-card";
import { RoomVinyl } from "./room-vinyl";
import { useWorkspace } from "./workspace-provider";
export function HomeFandoms() {
  const { t } = useWorkspace();
  return (
    <section className="discovery-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t.browseFandoms}</p>
          <h2>{t.yourWorld}</h2>
          <p>{t.fandomSectionHint}</p>
        </div>
        <Link className="text-link" href="/fandoms">
          {t.fandoms}
          <ArrowRight size={18} />
        </Link>
      </div>
      <div className="fandom-discovery">
        {featuredFandoms.slice(0, 5).map((fandom) => (
          <FandomCard key={fandom.id} fandom={fandom} />
        ))}
      </div>
    </section>
  );
}
export function MusicCollection() {
  const { t, state } = useWorkspace();
  const rooms = state.rooms
    .filter((room) => room.format === "music")
    .slice(0, 4);
  return (
    <div className="home-bottom-grid">
      <section className="music-collection">
        <div className="section-heading">
          <div>
            <h2>{t.musicSelection}</h2>
            <p>{t.musicSelectionHint}</p>
          </div>
          <Link className="text-link" href="/music">
            <Headphones size={18} />
            {t.topMusic}
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="music-rows">
          {!rooms.length && (
            <Link className="music-row music-row-empty" href="/rooms/create">
              <span className="row-number">+</span>
              <div>
                <h3>{t.musicEmptyTitle}</h3>
                <p>{t.musicEmptyHint}</p>
              </div>
              <ArrowUpRight size={19} />
            </Link>
          )}
          {rooms.map((room, i) => (
            <Link className="music-row" href={`/room/${room.id}`} key={room.id}>
              <span className="row-number">0{i + 1}</span>
              <RoomVinyl fandomId={room.fandomId} />
              <div>
                <h3>{room.name}</h3>
                <p>{room.description}</p>
              </div>
              <span className="row-status">{t.local}</span>
              <ArrowUpRight size={19} />
            </Link>
          ))}
        </div>
      </section>
      <aside className="friends-panel">
        <span className="friends-icon">
          <Users size={25} />
        </span>
        <h2>{t.friendsRooms}</h2>
        <p>{t.friendsHint}</p>
        <Link className="text-link" href="/rooms/create">
          {t.create}
          <ArrowRight size={17} />
        </Link>
      </aside>
    </div>
  );
}
