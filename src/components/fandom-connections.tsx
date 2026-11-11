"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  ArrowUpRight,
  RefreshCw,
  Film,
  Globe,
  PlaySquare,
  Search,
  Tv,
} from "lucide-react";
import information from "@/data/fandom-information.json";
import officialLinks from "@/data/fandom-official-links.json";
import type { NetworkRoom } from "@/lib/server/network-data";
import { useWorkspace } from "./workspace-provider";
export type FandomRoomsResult = {
  status: "ready" | "unconfigured" | "failed";
  rooms: NetworkRoom[];
};
type Info = {
  description: { ru: string; en: string };
  summary: { ru: string; en: string };
  sources: { ru: string | null; en: string };
  checked: string;
};
type OfficialKind = "stream" | "site" | "channel" | "league" | "search";
type Official = {
  provider: string;
  url: string;
  kind: OfficialKind;
  checked: string;
};
const officialLabels = {
  stream: "officialStream",
  site: "officialSite",
  channel: "officialChannel",
  league: "officialLeague",
  search: "officialSearch",
} as const;
const officialIcons = {
  stream: Tv,
  site: Globe,
  channel: PlaySquare,
  league: Tv,
  search: Search,
};
export function FandomConnections({
  id,
  result,
  summary,
}: {
  id: string;
  result?: FandomRoomsResult;
  /** Text for fandoms without stored information (community fandoms). */
  summary?: string;
}) {
  const { locale, t } = useWorkspace();
  const d = t.fandomPage;
  const info = (information as Record<string, Info>)[id];
  const official = (officialLinks as Record<string, Official[]>)[id] ?? [];
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const source = info?.sources[locale] || info?.sources.en;
  return (
    <>
      <div className="fandom-story-grid">
        <section className="brand-surface fandom-about">
          <p className="section-index">{d.aboutEyebrow}</p>
          <h2>{d.about}</h2>
          <p>
            {info?.description[locale] ||
              info?.summary[locale] ||
              summary ||
              d.noSummary}
          </p>
          {source && (
            <>
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                {d.source}
                <ArrowUpRight size={15} />
              </a>
              <small>
                {d.quote} · {info.checked}
              </small>
            </>
          )}
        </section>
        <section className="brand-surface fandom-watch">
          <p className="section-index">Discord · Katsodi</p>
          <h2>{d.legalFree}</h2>
          <a
            className="watch-source"
            href="https://discord.gg/hDpZq49wCU"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="watch-source-icon">
              <Film size={23} />
            </span>
            <span>
              <strong>{d.discordCommunity}</strong>
              <small>{d.legalFree}</small>
            </span>
            <ArrowUpRight size={20} />
          </a>
          <p className="form-hint">{d.discordNote}</p>
        </section>
      </div>
      {official.length > 0 && (
        <section
          className="brand-surface fandom-official"
          aria-labelledby="fandom-official-title"
        >
          <p className="section-index">{d.officialEyebrow}</p>
          <h2 id="fandom-official-title">{d.official}</h2>
          <ul className="fandom-official-list">
            {official.map((link) => {
              const Icon = officialIcons[link.kind] ?? Globe;
              return (
                <li key={link.url}>
                  <a
                    className="watch-source"
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="watch-source-icon">
                      <Icon size={22} />
                    </span>
                    <span>
                      <strong>{link.provider}</strong>
                      <small>
                        {d[officialLabels[link.kind]]} · {d.checked}{" "}
                        {link.checked}
                      </small>
                    </span>
                    <ArrowUpRight size={20} />
                  </a>
                </li>
              );
            })}
          </ul>
          <p className="form-hint">{d.officialNote}</p>
        </section>
      )}
      <section
        className="fandom-shared-rooms"
        aria-labelledby="fandom-rooms-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">{d.roomsEyebrow}</p>
            <h2 id="fandom-rooms-title">{d.rooms}</h2>
          </div>
          <button
            className="button button-secondary button-small"
            disabled={pending}
            onClick={() => startTransition(() => router.refresh())}
          >
            <RefreshCw size={16} className={pending ? "is-spinning" : ""} />
            {d.refresh}
          </button>
        </div>
        {!result || result.status !== "ready" ? (
          <div className="brand-surface" role="status">
            {result?.status === "failed" ? d.failed : d.unconfigured}
          </div>
        ) : result.rooms.length === 0 ? (
          <div className="fandom-room-empty brand-surface">
            <Film size={30} />
            <p>{d.empty}</p>
          </div>
        ) : (
          <div className="fandom-room-grid">
            {result.rooms.map((room) => (
              <Link
                className="brand-surface fandom-room-link"
                href={`/room/${room.id}`}
                key={room.id}
              >
                <span className="pill">{t[room.format]}</span>
                <h3>{room.name}</h3>
                <p>{room.description}</p>
                <ArrowUpRight size={20} />
              </Link>
            ))}
          </div>
        )}
        <Link
          className="button button-primary"
          href={`/network/create?fandom=${id}`}
        >
          {d.create}
          <ArrowUpRight size={17} />
        </Link>
      </section>
    </>
  );
}
