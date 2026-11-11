"use client";
import { HomeMusic } from "./home-music";
import Link from "next/link";
import {
  ArrowUpRight,
  AudioLines,
  Sparkles,
  Users,
  UserRound,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { featuredFandoms, fandomAssets } from "@/data/editorial";
import { EditorialImage } from "./editorial-image";
export function HomeQuickLinks() {
  const { t } = useWorkspace();
  const d = t.design;
  return (
    <nav className="home-spaces" aria-label={d.homeSpaces}>
      {[
        {
          href: "/network",
          title: d.sharedTile,
          body: d.sharedTileHint,
          Icon: AudioLines,
        },
        {
          href: "/friends",
          title: d.friendsTile,
          body: d.friendsTileHint,
          Icon: Users,
        },
        {
          href: "/onboarding",
          title: d.profileTile,
          body: d.profileTileHint,
          Icon: UserRound,
        },
      ].map(({ href, title, body, Icon }) => (
        <Link key={href} href={href}>
          <span className="space-link-icon">
            <Icon size={21} />
          </span>
          <span>
            <strong>{title}</strong>
            <small>{body}</small>
          </span>
          <ArrowUpRight size={17} />
        </Link>
      ))}
    </nav>
  );
}
export function WelcomePage() {
  const { t } = useWorkspace();
  const d = t.design;
  return (
    <>
      <section className="welcome-hero">
        <div className="welcome-copy">
          <p className="eyebrow">
            <span className="status-dot" />
            {d.welcomeEyebrow}
          </p>
          <h1>
            {d.welcomeTitle}
            <span className="brand-period">.</span>
          </h1>
          <p>{d.welcomeHint}</p>
          <div className="page-intro-actions">
            <Link className="button button-primary" href="/signup">
              {d.welcomeStart}
              <ArrowUpRight size={17} />
            </Link>
            <Link className="text-link" href="/home">
              {d.welcomeExplore}
            </Link>
          </div>
          <small>{d.sourceNotes}</small>
        </div>
        <div className="welcome-worlds">
          <i />
          <i />
          {featuredFandoms.slice(0, 3).map((f, index) => (
            <Link
              href={`/fandoms/${f.id}`}
              aria-label={f.name}
              className={`welcome-poster poster-${index}`}
              key={f.id}
            >
              <EditorialImage
                asset={fandomAssets[f.id]}
                sizes="230px"
                priority
              />
              <span>{f.name}</span>
            </Link>
          ))}
          <span className="welcome-audio">
            <AudioLines size={38} />
          </span>
          <span className="welcome-star">
            <Sparkles size={25} />
          </span>
        </div>
      </section>
      <HomeMusic />
      <HomeQuickLinks />
      <section className="welcome-note">
        <span>k.</span>
        <div>
          <p className="eyebrow">{d.invitationEyebrow}</p>
          <h2>{t.network.authStory}</h2>
          <p>{t.network.authStoryHint}</p>
        </div>
        <Link href="/fandoms" className="button button-secondary">
          {d.discoverFandoms}
          <ArrowUpRight size={16} />
        </Link>
      </section>
    </>
  );
}
