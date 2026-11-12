"use client";
import type { ReactNode } from "react";
import { ArrowUpRight, Github, Menu, Moon, Sun } from "lucide-react";
import { IntentLink as Link } from "./intent-link";
import { useWorkspace } from "./workspace-provider";
import { useTheme } from "./theme-provider";
import { publicLinks } from "@/lib/public-links";
import { OverviewMotion } from "./overview-motion";
import { FooterBrand, SiteFooter } from "./site-footer";

/**
 * Standalone frame of /overview: a transparent bar over the hero that turns
 * solid once the page scrolls (OverviewMotion sets data-scrolled), the page,
 * and the shared site footer.
 */
export function OverviewLayout({ children }: { children: ReactNode }) {
  const { t, locale, setLocale } = useWorkspace();
  const { theme, setTheme } = useTheme();
  const c = t.overviewLanding;
  const l = t.landing;
  const external = { target: "_blank", rel: "noopener noreferrer" } as const;
  return (
    <div className="overview-standalone">
      <a href="#main" className="skip-link">
        {t.skip}
      </a>
      <header className="ov-topbar">
        <div className="ov-topbar-inner">
          <Link href="/overview" className="kf-brand ov-brand" aria-label="Katsodi">
            <FooterBrand />
          </Link>
          <nav className="ov-links" aria-label={c.navigation}>
            <a href="#features">{l.navFeatures}</a>
            <a href="#how">{l.navHow}</a>
            <a href="#open-source">{l.navOpen}</a>
          </nav>
          <div className="ov-actions">
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
              className="ov-icon-button"
              type="button"
              aria-label={t.appearance}
              onClick={() => setTheme(theme === "paper" ? "obsidian" : "paper")}
            >
              {theme === "paper" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <a className="ov-button ov-button-ghost ov-hide-small" href={publicLinks.github} {...external}>
              <Github size={16} />
              {l.github}
            </a>
            <Link href="/home" className="ov-button ov-button-light">
              {l.openApp}
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <details
            className="ov-menu"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a"))
                event.currentTarget.open = false;
            }}
          >
            <summary aria-label={c.navigation}>
              <Menu size={20} />
            </summary>
            <nav aria-label={c.mobileNavigation}>
              <Link href="/home">{l.openApp}</Link>
              <a href="#features">{l.navFeatures}</a>
              <a href="#how">{l.navHow}</a>
              <a href="#open-source">{l.navOpen}</a>
              <a href={publicLinks.github} {...external}>
                GitHub
              </a>
              <a href={publicLinks.discord} {...external}>
                Discord
              </a>
              <a href={publicLinks.telegram} {...external}>
                Telegram
              </a>
            </nav>
          </details>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <div className="ov-footer-wrap">
        <SiteFooter />
      </div>
      <OverviewMotion />
    </div>
  );
}
