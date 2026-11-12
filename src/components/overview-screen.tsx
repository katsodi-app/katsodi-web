"use client";
import { useState, type KeyboardEvent } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  AudioLines,
  Film,
  Github,
  Headphones,
  KeyRound,
  MessageCircle,
  Mic,
  MonitorPlay,
  Music2,
  PenLine,
  Sparkles,
} from "lucide-react";
import { IntentLink as Link } from "./intent-link";
import { EditorialImage } from "./editorial-image";
import { assets, type AssetId } from "@/data/editorial";
import { useLocale } from "./workspace-provider";
import { publicLinks } from "@/lib/public-links";
import { OverviewFilm } from "./overview-film";

/** A headline with one handwritten word, e.g. "Watch it *together*." */
function Mixed({
  before,
  accent,
  after,
}: {
  before: string;
  accent: string;
  after: string;
}) {
  return (
    <>
      {before} <em className="ov-cursive">{accent}</em>
      {after === "." ? after : ` ${after}`}
    </>
  );
}

export function OverviewScreen() {
  const { t } = useLocale();
  const o = t.overview;
  const c = t.overviewLanding;
  const l = t.landing;
  const external = { target: "_blank", rel: "noopener noreferrer" } as const;
  const [selected, setSelected] = useState(0);
  const modes = [
    {
      title: o.video,
      titleLong: o.videoTitle,
      body: o.videoBody,
      cta: o.videoCta,
      href: "/network",
      asset: "cinema" as AssetId,
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
  const mode = modes[selected];
  function moveTab(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? modes.length - 1
          : (selected + (event.key === "ArrowRight" ? 1 : modes.length - 1)) %
            modes.length;
    setSelected(index);
    event.currentTarget
      .querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [index]?.focus();
  }
  const features = [
    { icon: MonitorPlay, title: l.featurePlayerTitle, body: l.featurePlayerBody },
    { icon: Mic, title: l.featureVoiceTitle, body: l.featureVoiceBody },
    { icon: PenLine, title: l.featureDemoTitle, body: l.featureDemoBody },
    { icon: Music2, title: l.featureMusicTitle, body: l.featureMusicBody },
    { icon: Sparkles, title: l.featureFandomsTitle, body: l.featureFandomsBody },
    { icon: KeyRound, title: l.featurePrivateTitle, body: l.featurePrivateBody },
  ];
  const steps = [
    [o.stepOne, o.stepOneBody],
    [o.stepTwo, o.stepTwoBody],
    [o.stepThree, o.stepThreeBody],
  ];
  return (
    <div className="ov-page">
      {/* 1. Hero: night sky, one handwritten word, a glass room preview. */}
      <section className="ov-hero" aria-labelledby="overview-title">
        <div className="ov-sky" aria-hidden="true">
          <EditorialImage asset={assets.space} priority sizes="100vw" className="ov-sky-photo" />
          <div className="ov-veil" />
        </div>
        <div className="ov-hero-copy ov-container">
          <p className="ov-badge" data-reveal>
            <span className="ov-badge-dot" />
            {l.badge}
          </p>
          <h1 id="overview-title" className="ov-display" data-reveal>
            <Mixed before={l.heroBefore} accent={l.heroAccent} after={l.heroAfter} />
          </h1>
          <p className="ov-lead" data-reveal>
            {l.heroBody}
          </p>
          <div className="ov-cta" data-reveal>
            <Link href="/network/create" className="ov-button ov-button-light">
              {l.heroPrimary}
              <ArrowUpRight size={16} />
            </Link>
            <a href="#features" className="ov-button ov-button-ghost">
              {l.heroSecondary}
            </a>
          </div>
        </div>
        <div className="ov-glass-stage" data-tilt aria-hidden="true">
          <div className="ov-glass">
            <div className="ov-glass-bar">
              <span className="ov-glass-dots">
                <i />
                <i />
                <i />
              </span>
              <strong>{l.previewRoom}</strong>
              <span className="ov-glass-people">{l.previewPeople}</span>
            </div>
            <div className="ov-glass-body">
              <div className="ov-glass-player">
                <EditorialImage asset={assets.dunes} sizes="(max-width: 900px) 90vw, 40vw" />
                <span className="ov-glass-now">
                  <AudioLines size={14} />
                  {l.previewNow}
                </span>
                <span className="ov-glass-progress">
                  <i />
                </span>
              </div>
              <div className="ov-glass-chat">
                <p className="ov-bubble">{l.previewMsgOne}</p>
                <p className="ov-bubble ov-bubble-them">{l.previewMsgTwo}</p>
                <p className="ov-bubble">{l.previewMsgThree}</p>
                <span className="ov-glass-voice">
                  <span className="ov-avatar is-speaking">A</span>
                  <span className="ov-avatar">M</span>
                  <span className="ov-avatar">K</span>
                  <Mic size={14} />
                  {l.previewVoice}
                </span>
              </div>
            </div>
          </div>
        </div>
        <a className="ov-scroll" href="#features">
          {l.scrollHint}
          <ArrowDown size={16} />
        </a>
      </section>

      {/* 2. Poster-scale statement, sliding with the scroll. */}
      <section className="ov-poster" aria-label={l.poster}>
        <div className="ov-marquee" data-marquee aria-hidden="true">
          <span>{l.poster}</span>
          <span>{l.poster}</span>
          <span>{l.poster}</span>
        </div>
      </section>

      {/* 3. Features. */}
      <section id="features" className="ov-section ov-container" aria-labelledby="features-title">
        <header className="ov-head">
          <p className="ov-eyebrow" data-reveal>
            {l.featuresEyebrow}
          </p>
          <h2 id="features-title" className="ov-title" data-reveal>
            <Mixed before={l.featuresBefore} accent={l.featuresAccent} after={l.featuresAfter} />
          </h2>
          <p className="ov-sub" data-reveal>
            {l.featuresBody}
          </p>
        </header>
        <ul className="ov-features">
          {features.map(({ icon: Icon, title, body }) => (
            <li key={title} className="ov-card" data-reveal>
              <span className="ov-card-icon">
                <Icon size={20} />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 4. Three moods: pill toggle with a crossfading photo card. */}
      <section className="ov-section ov-container ov-modes" aria-labelledby="modes-title">
        <header className="ov-head">
          <p className="ov-eyebrow" data-reveal>
            {l.modesEyebrow}
          </p>
          <h2 id="modes-title" className="ov-title" data-reveal>
            <Mixed before={l.modesBefore} accent={l.modesAccent} after={l.modesAfter} />
          </h2>
        </header>
        <div className="ov-pills" role="tablist" aria-label={c.modeLabel} onKeyDown={moveTab} data-reveal>
          {modes.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                type="button"
                role="tab"
                id={`ov-mode-${index}`}
                aria-controls="ov-mode-panel"
                aria-selected={selected === index}
                tabIndex={selected === index ? 0 : -1}
                onClick={() => setSelected(index)}
              >
                <Icon size={16} />
                {item.title}
              </button>
            );
          })}
        </div>
        <div
          className="ov-mode"
          id="ov-mode-panel"
          role="tabpanel"
          aria-labelledby={`ov-mode-${selected}`}
          key={selected}
        >
          <EditorialImage asset={assets[mode.asset]} sizes="(max-width: 900px) 92vw, 55vw" className="ov-mode-photo" />
          <div className="ov-mode-copy">
            <h3>{mode.titleLong}</h3>
            <p>{mode.body}</p>
            <Link href={mode.href} className="ov-link">
              {mode.cta}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. The launch film. */}
      <section className="ov-section ov-container ov-film" aria-labelledby="film-title">
        <header className="ov-head">
          <p className="ov-eyebrow" data-reveal>
            {l.filmEyebrow}
          </p>
          <h2 id="film-title" className="ov-title" data-reveal>
            {c.filmTitle}
          </h2>
          <p className="ov-sub" data-reveal>
            {c.filmIntro}
          </p>
        </header>
        <div className="ov-film-frame" data-reveal>
          <OverviewFilm />
        </div>
        <p className="ov-film-note">
          {c.filmNote} ·{" "}
          <Link href="/credits" className="ov-link">
            {c.filmCredits}
          </Link>
        </p>
      </section>

      {/* 6. How it works: three numbered steps. */}
      <section id="how" className="ov-section ov-container" aria-labelledby="how-title">
        <header className="ov-head">
          <p className="ov-eyebrow" data-reveal>
            {l.stepsEyebrow}
          </p>
          <h2 id="how-title" className="ov-title" data-reveal>
            {o.stepsTitle}
          </h2>
        </header>
        <ol className="ov-steps">
          {steps.map(([title, body], index) => (
            <li key={title} data-reveal>
              <span className="ov-step-number" aria-hidden="true">
                0{index + 1}
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 7. Open source: a second full-bleed photograph. */}
      <section id="open-source" className="ov-open" aria-labelledby="open-title">
        <div className="ov-sky" aria-hidden="true">
          <EditorialImage asset={assets.forest} sizes="100vw" className="ov-sky-photo" />
          <div className="ov-veil ov-veil-strong" />
        </div>
        <div className="ov-container ov-open-grid">
          <div>
            <p className="ov-eyebrow ov-eyebrow-light" data-reveal>
              <Github size={14} />
              {l.openEyebrow}
            </p>
            <h2 id="open-title" className="ov-title ov-title-light" data-reveal>
              <Mixed before={l.openBefore} accent={l.openAccent} after={l.openAfter} />
            </h2>
            <p className="ov-sub ov-sub-light" data-reveal>
              {l.openBody}
            </p>
            <div className="ov-cta" data-reveal>
              <a href={publicLinks.github} className="ov-button ov-button-light" {...external}>
                <Github size={16} />
                {l.openPrimary}
              </a>
              <a href={publicLinks.githubIssues} className="ov-button ov-button-ghost ov-button-on-photo" {...external}>
                {l.openSecondary}
                <ArrowUpRight size={15} />
              </a>
            </div>
          </div>
          <div className="ov-terminal" data-reveal>
            <p className="ov-terminal-line">
              <span aria-hidden="true">$</span> git clone {publicLinks.github}.git
            </p>
            <dl className="ov-facts">
              <div>
                <dt>{l.openLicenseLabel}</dt>
                <dd>MIT</dd>
              </div>
              <div>
                <dt>{l.openStackLabel}</dt>
                <dd>Next.js · Supabase · LiveKit</dd>
              </div>
              <div>
                <dt>{l.openLanguagesLabel}</dt>
                <dd>RU · EN</dd>
              </div>
            </dl>
            <p className="ov-terminal-note">{l.openNote}</p>
          </div>
        </div>
      </section>

      {/* 8. Honest status. */}
      <section className="ov-section ov-container" aria-labelledby="honest-title">
        <div className="ov-honest" data-reveal>
          <MessageCircle size={20} />
          <div>
            <p className="ov-eyebrow">{o.honestEyebrow}</p>
            <h2 id="honest-title">{o.honestTitle}</h2>
            <p>{o.honestBody}</p>
            <p>{o.localNote}</p>
            <p>
              {o.rightsNote}{" "}
              <Link href="/copyright" className="ov-link">
                {o.rightsCta}
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* 9. Finale poster. */}
      <section className="ov-finale" aria-labelledby="finale-title">
        <h2 id="finale-title" className="ov-finale-poster" data-reveal>
          {l.finalePoster}
        </h2>
        <div className="ov-container ov-finale-copy">
          <p className="ov-sub" data-reveal>
            {o.finaleBody}
          </p>
          <div className="ov-cta" data-reveal>
            <Link href="/home" className="ov-button ov-button-light">
              {l.openApp}
              <ArrowUpRight size={16} />
            </Link>
            <a href={publicLinks.discord} className="ov-button ov-button-ghost" {...external}>
              Discord
              <ArrowUpRight size={15} />
            </a>
            <a href={publicLinks.github} className="ov-button ov-button-ghost" {...external}>
              <Github size={16} />
              GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
