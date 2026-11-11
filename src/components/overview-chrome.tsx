"use client";
import type { ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Menu,
  Moon,
  Sun,
} from "lucide-react";
import { IntentLink as Link } from "./intent-link";
import { useLocale, useWorkspace } from "./workspace-provider";
import { useTheme } from "./theme-provider";
import { legalOrder } from "./legal-page";
import { publicLinks } from "@/lib/public-links";
import { OverviewMotion } from "./overview-motion";

export function OverviewBrand() {
  return (
    <>
      <span className="overview-brand-icon">
        <AudioLines size={25} />
      </span>
      katsodi<span className="overview-brand-dot">.</span>
    </>
  );
}

export function OverviewFooter({ site = false }: { site?: boolean }) {
  const { t } = useLocale();
  const c = t.overviewLanding;
  const email = publicLinks.email;
  return (
    <footer
      className={`overview-footer${site ? " site-footer" : ""}`}
      aria-label={c.footerLabel}
    >
      <div className="overview-footer-inner">
        <div className="overview-footer-brand-column">
          <Link href="/overview" className="overview-brand">
            <OverviewBrand />
          </Link>
          <p>{c.footerIntro}</p>
          <form
            action="/fandoms"
            method="get"
            className="overview-footer-search"
            role="search"
          >
            <label className="sr-only" htmlFor="overview-fandom-search">
              {c.searchLabel}
            </label>
            <input
              type="search"
              id="overview-fandom-search"
              name="q"
              placeholder={c.searchPlaceholder}
              maxLength={100}
            />
            <button type="submit" aria-label={c.searchLabel}>
              <ArrowRight size={19} />
            </button>
          </form>
        </div>
        <nav aria-label={c.product}>
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
          <h2>{c.explore}</h2>
          <ul>
            <li>
              <Link href="/overview#experience">{c.features}</Link>
            </li>
            <li>
              <Link href="/overview#possibilities">{c.possibilities}</Link>
            </li>
          </ul>
        </nav>
        <nav aria-label={c.community}>
          <h2>{c.community}</h2>
          <ul>
            <li>
              <a
                href="https://discord.gg/hDpZq49wCU"
                target="_blank"
                rel="noopener noreferrer"
              >
                Discord
                <ArrowUpRight size={13} />
              </a>
            </li>
            <li>
              <a
                href="https://t.me/katsodi"
                target="_blank"
                rel="noopener noreferrer"
              >
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
          </ul>
          <h2>{c.contact}</h2>
          <ul>
            <li>
              <a href={`mailto:${email}`}>{email}</a>
            </li>
          </ul>
        </nav>
        <nav aria-label={t.legal.footerNav}>
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
      <div className="overview-footer-bottom">
        <span>{t.footer}</span>
        <span>{c.browserNote}</span>
        <Link href="/cookies#preferences">{c.privacyChoices}</Link>
      </div>
    </footer>
  );
}

export function OverviewLayout({ children }: { children: ReactNode }) {
  const { t, locale, setLocale } = useWorkspace();
  const { theme, setTheme } = useTheme();
  const c = t.overviewLanding;
  return (
    <div className="overview-standalone">
      <a href="#main" className="skip-link">
        {t.skip}
      </a>
      <header className="overview-topbar">
        <div className="overview-topbar-inner">
          <Link
            href="/overview"
            className="overview-brand"
            aria-label="Katsodi"
          >
            <OverviewBrand />
          </Link>
          <nav className="overview-desktop-links" aria-label={c.navigation}>
            <a href="#experience">{c.product}</a>
            <a href="#possibilities">{c.possibilities}</a>
            <a
              href="https://discord.gg/hDpZq49wCU"
              target="_blank"
              rel="noopener noreferrer"
            >
              {c.community}
            </a>
          </nav>
          <div className="overview-topbar-actions">
            <div className="language-switch" aria-label={t.language}>
              <button
                aria-pressed={locale === "ru"}
                onClick={() => setLocale("ru")}
              >
                RU
              </button>
              <button
                aria-pressed={locale === "en"}
                onClick={() => setLocale("en")}
              >
                EN
              </button>
            </div>
            <button
              className="overview-theme-toggle"
              type="button"
              aria-label={t.appearance}
              onClick={() => setTheme(theme === "paper" ? "obsidian" : "paper")}
            >
              {theme === "paper" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <Link href="/home" className="button button-primary button-small">
              {c.openApp}
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <details
            className="overview-mobile-menu"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a"))
                event.currentTarget.open = false;
            }}
          >
            <summary aria-label={c.navigation}>
              <Menu size={20} />
            </summary>
            <nav aria-label={c.mobileNavigation}>
              <a href="#experience">{c.product}</a>
              <a href="#possibilities">{c.possibilities}</a>
              <a
                href="https://discord.gg/hDpZq49wCU"
                target="_blank"
                rel="noopener noreferrer"
              >
                Discord
              </a>
              <a
                href="https://t.me/katsodi"
                target="_blank"
                rel="noopener noreferrer"
              >
                Telegram
              </a>
            </nav>
          </details>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <OverviewFooter />
      <OverviewMotion />
    </div>
  );
}
