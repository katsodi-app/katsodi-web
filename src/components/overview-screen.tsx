"use client";
import { useState, type KeyboardEvent } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  AudioLines,
  Film,
  Headphones,
  MessageCircle,
  MonitorPlay,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { IntentLink as Link } from "./intent-link";
import { EditorialImage } from "./editorial-image";
import { assets, type AssetId } from "@/data/editorial";
import { useLocale } from "./workspace-provider";
import { OverviewBrand } from "./overview-chrome";
import { OverviewFilm } from "./overview-film";

function Doodle({ variant }: { variant: number }) {
  return (
    <svg viewBox="0 0 160 160" fill="none" aria-hidden="true">
      <path
        d={
          [
            "M-20 20C65-40 130 120 30 100S85-20 125 30 25 160 95 170M-10 70C60 0 155 100 85 130S0 50 40 10",
            "M-20 90C30 0 105 0 90 70S10 160 45 100 150-10 160 40M0 140C45 35 150 25 145 100S70 160 85 125",
            "M10-20C110 50-20 90 50 140S170 50 120 35 40 170 95 180M-10 30C85 140 110-15 160 80",
            "M-10 150C10 50 90-30 90 35S0 140 70 130 170 15 140 0M30 180C10 100 150 90 160 25",
          ][variant % 4]
        }
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

export function OverviewScreen() {
  const { t } = useLocale();
  const o = t.overview;
  const c = t.overviewLanding;
  const [selected, setSelected] = useState(0);
  const views = [
    {
      title: o.video,
      titleLong: o.videoTitle,
      body: o.videoBody,
      cta: o.videoCta,
      href: "/network",
      asset: "space" as AssetId,
      icon: Film,
    },
    {
      title: o.music,
      titleLong: o.musicTitle,
      body: o.musicBody,
      cta: o.musicCta,
      href: "/music",
      asset: "vinyl" as AssetId,
      icon: Headphones,
    },
    {
      title: o.community,
      titleLong: o.communityTitle,
      body: o.communityBody,
      cta: o.communityCta,
      href: "/fandoms",
      asset: "tokyo" as AssetId,
      icon: Sparkles,
    },
  ];
  const view = views[selected];
  const ViewIcon = view.icon;
  function moveTab(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? 2
          : (selected + (event.key === "ArrowRight" ? 1 : 2)) % 3;
    setSelected(index);
    event.currentTarget
      .querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [index]?.focus();
  }
  const cards: [AssetId | null, string][] = [
    ["coast", c.tileCoast],
    [null, c.tileChat],
    ["vinyl", c.tileMusic],
    [null, c.tileDemo],
    ["forest", c.tileWorlds],
    ["concert", c.tileFriends],
    [null, c.tileQueue],
    [null, c.tileEvening],
  ];
  const branches = [
    {
      title: c.mapWatch,
      href: "/network",
      leaves: [c.mapPlayers, c.mapQueue, c.mapDemo],
    },
    {
      title: c.mapListen,
      href: "/music",
      leaves: [c.mapTracks, c.mapPlaylists, c.mapTogether],
    },
    {
      title: c.mapDiscover,
      href: "/fandoms",
      leaves: [c.mapFandoms, c.mapCollections, c.mapStories],
    },
    {
      title: c.mapPersonal,
      href: "/account",
      leaves: [c.mapProfile, c.mapThemes, c.mapAvatar],
    },
    {
      title: c.mapConnect,
      href: "/network/create",
      leaves: [c.mapChat, c.mapVoice, c.mapAnnotations],
    },
    {
      title: c.mapCompany,
      href: "/friends",
      leaves: [c.mapInvites, c.mapFriends, c.mapPrivate],
    },
  ];
  return (
    <div className="overview-page">
      <section className="overview-hero" aria-labelledby="overview-title">
        <div className="overview-constellation" aria-hidden="true">
          {cards.map(([asset, label], index) => (
            <div
              className={`overview-floating-tile tile-${index + 1}`}
              key={label}
            >
              <div
                className={
                  asset ? "overview-tile-photo" : "overview-tile-doodle"
                }
              >
                {asset ? (
                  <EditorialImage
                    asset={assets[asset]}
                    priority={index < 3}
                    sizes="150px"
                  />
                ) : (
                  <Doodle variant={index} />
                )}
              </div>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="overview-hero-copy">
          <p className="eyebrow">
            <AudioLines size={15} />
            {o.eyebrow}
          </p>
          <h1 id="overview-title">
            {o.title}
            <span>{o.titleAccent}</span>
          </h1>
          <p className="overview-lead">{o.intro}</p>
          <div className="overview-actions">
            <Link href="/home" className="button button-primary">
              {c.tryApp}
              <ArrowUpRight size={17} />
            </Link>
            <Link href="/network/create" className="button button-secondary">
              {o.create}
              <Users size={17} />
            </Link>
          </div>
          <p className="overview-status">
            <span />
            {o.status}
          </p>
        </div>
        <a
          href="#experience"
          className="overview-scroll-link"
          aria-label={o.explore}
        >
          <ArrowDown size={18} />
        </a>
      </section>

      <section
        className="overview-section overview-film"
        aria-labelledby="overview-film-title"
      >
        <div className="overview-heading">
          <p className="eyebrow">KATSODI / 00:20</p>
          <h2 id="overview-film-title">{c.filmTitle}</h2>
          <p>{c.filmIntro}</p>
        </div>
        <OverviewFilm />
        <p className="overview-film-caption">
          {c.filmNote}{" "}
          <a href="/media/katsodi-launch-credits.txt">{c.filmCredits}</a>
        </p>
      </section>
      <section
        id="experience"
        className="overview-section overview-experience-section"
        aria-labelledby="overview-experience-title"
      >
        <div className="overview-heading">
          <p className="eyebrow">01 / {o.experienceEyebrow}</p>
          <h2 id="overview-experience-title">{o.experienceTitle}</h2>
          <p>{o.experienceIntro}</p>
        </div>
        <div
          className="overview-mode-tabs"
          role="tablist"
          aria-label={c.modeLabel}
          onKeyDown={moveTab}
        >
          {views.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.title}
                role="tab"
                id={`overview-tab-${index}`}
                aria-selected={selected === index}
                aria-controls="overview-preview-panel"
                tabIndex={selected === index ? 0 : -1}
                onClick={() => setSelected(index)}
              >
                <Icon size={17} />
                {item.title}
              </button>
            );
          })}
        </div>
        <div
          className="overview-feature-preview"
          role="tabpanel"
          tabIndex={0}
          id="overview-preview-panel"
          aria-labelledby={`overview-tab-${selected}`}
        >
          <div className="overview-feature-copy">
            <span className="overview-feature-symbol">
              <ViewIcon size={27} />
            </span>
            <h3>{view.titleLong}</h3>
            <p>{view.body}</p>
            <Link href={view.href} className="text-link">
              {view.cta}
              <ArrowUpRight size={17} />
            </Link>
            <small>{c.previewNote}</small>
          </div>
          <div
            className="overview-room-preview"
            role="img"
            aria-label={c.previewLabel}
          >
            <div className="overview-room-bar">
              <span className="overview-preview-brand">
                <AudioLines size={17} />
                katsodi
              </span>
              <span>{c.sharedRoom}</span>
              <span className="overview-window-dots">
                <i />
                <i />
                <i />
              </span>
            </div>
            <div className="overview-preview-body">
              <div className="overview-preview-player">
                <EditorialImage
                  asset={assets[view.asset]}
                  sizes="(max-width: 720px) 85vw, 48vw"
                />
                <span className="overview-preview-play">
                  <Play size={23} />
                </span>
                <div className="overview-preview-timeline">
                  <span />
                  <i />
                  <AudioLines size={15} />
                </div>
              </div>
              <div className="overview-preview-chat">
                <strong>
                  <MessageCircle size={14} />
                  {c.mapChat}
                </strong>
                <div className="overview-preview-bubble">{c.messageOne}</div>
                <div className="overview-preview-bubble">{c.messageTwo}</div>
                <div className="overview-preview-bubble">
                  {c.messageThree}
                  <span>♥</span>
                </div>
                <div className="overview-preview-input">
                  {c.messagePlaceholder}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="overview-bento-grid">
          <article>
            <span className="overview-bento-eyebrow">
              <MonitorPlay size={18} />
              {o.demoTitle}
            </span>
            <h3>{c.bentoDemoTitle}</h3>
            <p>{o.demoBody}</p>
            <div className="overview-annotation-art" aria-hidden="true">
              <svg viewBox="0 0 440 150" fill="none">
                <rect
                  x="70"
                  y="32"
                  width="300"
                  height="88"
                  rx="10"
                  stroke="currentColor"
                  opacity=".3"
                />
                <path
                  d="M55 85C85-10 340-10 384 70S180 172 72 119M330 16L361 41 325 47"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <span>
                <MonitorPlay size={25} />
              </span>
            </div>
          </article>
          <article>
            <span className="overview-bento-eyebrow">
              <ShieldCheck size={18} />
              {o.controlTitle}
            </span>
            <h3>{c.bentoControlTitle}</h3>
            <p>{o.controlBody}</p>
            <div className="overview-access-art" aria-hidden="true">
              <span>
                <Users size={22} />
                {c.mapFriends}
              </span>
              <span>
                <ShieldCheck size={22} />
                {c.mapPrivate}
              </span>
              <span>
                <MessageCircle size={22} />
                {c.mapChat}
              </span>
            </div>
          </article>
        </div>
      </section>

      <section
        id="possibilities"
        className="overview-section overview-map-section"
        aria-labelledby="overview-map-title"
      >
        <div className="overview-heading">
          <p className="eyebrow">02 / {c.possibilities}</p>
          <h2 id="overview-map-title">{c.mapTitle}</h2>
          <p>{c.mapIntro}</p>
        </div>
        <nav className="overview-map" aria-label={c.mapLabel}>
          <svg
            className="overview-map-lines"
            viewBox="0 0 1000 600"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
          >
            <g stroke="currentColor" strokeWidth="1">
              <path d="M465 270L280 115M535 270L720 115M440 300L150 300M560 300L850 300M465 330L280 485M535 330L720 485" />
              <path
                d="M280 115L180 45M280 115L360 30M280 115L165 170M720 115L620 30M720 115L835 45M720 115L840 170M150 300L40 235M150 300L25 310M150 300L65 380M850 300L950 235M850 300L975 310M850 300L940 380M280 485L150 540M280 485L280 580M280 485L390 550M720 485L610 550M720 485L720 580M720 485L855 540"
                opacity=".4"
              />
            </g>
          </svg>
          <div className="overview-map-center">
            <OverviewBrand />
          </div>
          <ul>
            {branches.map((branch, index) => (
              <li
                className={`overview-map-branch branch-${index + 1}`}
                key={branch.title}
              >
                <h3>
                  <Link href={branch.href}>
                    {branch.title}
                    <ArrowUpRight size={14} />
                  </Link>
                </h3>
                <ul>
                  {branch.leaves.map((leaf) => (
                    <li key={leaf}>{leaf}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>
      </section>

      <section
        className="overview-section overview-steps-section"
        aria-labelledby="overview-steps-title"
      >
        <div className="overview-heading">
          <p className="eyebrow">03 / {o.stepsEyebrow}</p>
          <h2 id="overview-steps-title">{o.stepsTitle}</h2>
        </div>
        <ol className="overview-steps">
          {[
            [o.stepOne, o.stepOneBody],
            [o.stepTwo, o.stepTwoBody],
            [o.stepThree, o.stepThreeBody],
          ].map(([title, body], i) => (
            <li key={title}>
              <span>0{i + 1}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
      </section>
      <section
        className="overview-section overview-honest"
        aria-labelledby="overview-status-title"
      >
        <div>
          <p className="eyebrow">{o.honestEyebrow}</p>
          <h2 id="overview-status-title">{o.honestTitle}</h2>
        </div>
        <div>
          <p>{o.honestBody}</p>
          <p>{o.localNote}</p>
          <p>{o.rightsNote}</p>
          <Link href="/copyright" className="text-link">
            {o.rightsCta}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
      <section
        className="overview-finale"
        aria-labelledby="overview-finale-title"
      >
        <Sparkles size={24} />
        <h2 id="overview-finale-title">{o.finale}</h2>
        <p>{o.finaleBody}</p>
        <div className="overview-actions">
          <Link href="/network/create" className="button button-primary">
            {o.create}
            <ArrowUpRight size={18} />
          </Link>
          <a
            href="https://discord.gg/hDpZq49wCU"
            target="_blank"
            rel="noopener noreferrer"
            className="button button-secondary"
          >
            Discord
            <ArrowUpRight size={17} />
          </a>
        </div>
      </section>
    </div>
  );
}
