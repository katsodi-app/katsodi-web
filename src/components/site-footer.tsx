"use client";
import { ArrowRight, ArrowUp, ArrowUpRight, AudioLines, Github } from "lucide-react";
import { IntentLink as Link } from "./intent-link";
import { useLocale } from "./workspace-provider";
import { legalOrder } from "./legal-page";
import { publicLinks } from "@/lib/public-links";

/** The brand mark shared by the footer and the overview top bar. */
export function FooterBrand() {
  return (
    <>
      <span className="kf-brand-icon">
        <AudioLines size={22} />
      </span>
      <span>
        katsodi<span className="kf-brand-dot">.</span>
      </span>
    </>
  );
}

/**
 * The one footer of the site: overview, sign-in pages and every app page.
 * Flat, aligned to the content edges, and compact on phones.
 */
export function SiteFooter() {
  const { t } = useLocale();
  const c = t.overviewLanding;
  const l = t.landing;
  const external = { target: "_blank", rel: "noopener noreferrer" } as const;
  return (
    <footer className="site-footer kf" aria-label={c.footerLabel}>
      <div className="kf-main">
        <div className="kf-about">
          <Link href="/overview" className="kf-brand">
            <FooterBrand />
          </Link>
          <p>{c.footerIntro}</p>
          <a className="kf-open" href={publicLinks.github} {...external}>
            <Github size={16} />
            <span>{l.footerOpenSource}</span>
            <ArrowUpRight size={14} />
          </a>
          <form action="/fandoms" method="get" className="kf-search" role="search">
            <label className="sr-only" htmlFor="site-footer-search">
              {c.searchLabel}
            </label>
            <input
              type="search"
              id="site-footer-search"
              name="q"
              placeholder={c.searchPlaceholder}
              maxLength={100}
            />
            <button type="submit" aria-label={c.searchLabel}>
              <ArrowRight size={17} />
            </button>
          </form>
        </div>
        <nav className="kf-column" aria-label={c.product}>
          <h2>{c.product}</h2>
          <ul>
            <li>
              <Link href="/overview">{t.overview.footerLink}</Link>
            </li>
            <li>
              <Link href="/network">{t.network.catalog}</Link>
            </li>
            <li>
              <Link href="/music">{t.topMusic}</Link>
            </li>
            <li>
              <Link href="/fandoms">{t.fandoms}</Link>
            </li>
            <li>
              <Link href="/network/create">{t.create}</Link>
            </li>
            <li>
              <Link href="/login">{c.signIn}</Link>
            </li>
          </ul>
        </nav>
        <nav className="kf-column" aria-label={c.community}>
          <h2>{c.community}</h2>
          <ul>
            <li>
              <a href={publicLinks.github} {...external}>
                {l.github}
                <ArrowUpRight size={13} />
              </a>
            </li>
            <li>
              <a href={publicLinks.discord} {...external}>
                Discord
                <ArrowUpRight size={13} />
              </a>
            </li>
            <li>
              <a href={publicLinks.telegram} {...external}>
                Telegram
                <ArrowUpRight size={13} />
              </a>
            </li>
            <li>
              <Link href="/friends">{t.friends.tab_friends}</Link>
            </li>
            <li>
              <Link href="/fandoms/request">{c.suggestFandom}</Link>
            </li>
            <li>
              <a href={`mailto:${publicLinks.email}`}>{publicLinks.email}</a>
            </li>
          </ul>
        </nav>
        <nav className="kf-column" aria-label={t.legal.footerNav}>
          <h2>{c.documents}</h2>
          <ul>
            {legalOrder.map((slug) => (
              <li key={slug}>
                <Link href={`/${slug}`}>{t.legalLinks[slug]}</Link>
              </li>
            ))}
            <li>
              <Link href="/credits">{t.photoCredits}</Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="kf-bottom">
        <span>{t.footer}</span>
        <span>{l.footerOpenNote}</span>
        <Link href="/cookies#preferences">{c.privacyChoices}</Link>
        <a href="#main" className="kf-top">
          {l.footerTop}
          <ArrowUp size={14} />
        </a>
      </div>
    </footer>
  );
}
