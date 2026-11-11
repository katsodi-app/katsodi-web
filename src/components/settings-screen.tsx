"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  Database,
  Languages,
  Palette,
  UserRound,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { ThemePicker } from "./theme-picker";
import { PageIntro } from "./page-design";

export function SettingsScreen() {
  const { t, locale, setLocale, clear, ready } = useWorkspace();
  return (
    <>
      <PageIntro
        eyebrow={t.design.settingsEyebrow}
        title={t.settings}
        description={t.settingsIntro}
        motif="settings"
      />
      <div className="settings-layout">
        <nav className="settings-index" aria-label={t.settings}>
          <a href="#appearance">
            <Palette size={17} />
            {t.appearance}
          </a>
          <a href="#preferences">
            <Languages size={17} />
            {t.design.preferences}
          </a>
          <a href="#local-storage">
            <Database size={17} />
            {t.storage}
          </a>
          <Link href="/account">
            <UserRound size={17} />
            {t.network.account}
          </Link>
        </nav>
        <div className="settings-surface">
          <div id="appearance" className="settings-surface">
            <ThemePicker />
          </div>
          <div className="settings-card" id="preferences">
            <section>
              <div>
                <h2>{t.language}</h2>
                <p>{t.languageHint}</p>
              </div>
              <select
                aria-label={t.language}
                value={locale}
                onChange={(e) => setLocale(e.target.value as "ru" | "en")}
              >
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </section>
            <section id="local-storage" className="settings-danger">
              <div>
                <h2>{t.storage}</h2>
                <p>{t.design.dangerHint}</p>
              </div>
              <button
                disabled={!ready}
                className="button button-secondary"
                onClick={() => {
                  if (window.confirm(t.clearConfirm)) clear();
                }}
              >
                {t.clear}
              </button>
            </section>
            <section>
              <div className="settings-account-link">
                <UserRound size={23} />
                <div>
                  <h2>{t.network.account}</h2>
                  <p>{t.design.sessionHint}</p>
                </div>
              </div>
              <Link href="/account" className="text-link">
                <ArrowUpRight size={19} />
                <span className="sr-only">{t.network.account}</span>
              </Link>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
