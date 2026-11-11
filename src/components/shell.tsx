"use client";
import { IntentLink as Link } from "./intent-link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  AudioLines,
  Bookmark,
  Compass,
  Home,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
  Sparkles,
  WifiOff,
  Users,
  ListMusic,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { UserAvatar } from "./user-avatar";
import { SiteFooter } from "./site-footer";
import { DocumentTitle } from "./document-title";
import { ConsentBanner } from "./consent-banner";
import { OverviewLayout } from "./overview-chrome";

// Search and the dock carry the fandom catalogue and artwork data. They are
// client-only and load once opened, so ordinary pages neither download nor
// hydrate them.
const QuickSearch = dynamic(
  () => import("./quick-search").then((module) => module.QuickSearch),
  { ssr: false },
);
const CompanionDock = dynamic(
  () => import("./companion-dock").then((module) => module.CompanionDock),
  { ssr: false },
);

export function Shell({
  children,
  backendConfigured = false,
}: {
  children: ReactNode;
  backendConfigured?: boolean;
}) {
  const {
    t,
    locale,
    setLocale,
    storageError,
    toggleSearch,
    searchOpen,
    activeCompanion,
    currentRoom,
  } = useWorkspace();
  const pathname = usePathname();
  const [avatarRevision, setAvatarRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setAvatarRevision((value) => value + 1);
    window.addEventListener("katsodi:profile-media", refresh);
    return () => window.removeEventListener("katsodi:profile-media", refresh);
  }, []);
  const [identity, setIdentity] = useState<{
    id: string;
    name: string;
    available: boolean;
    version: string | null;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/account/avatar", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!controller.signal.aborted) setIdentity(data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [pathname, avatarRevision]);
  const [offline, setOffline] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore a browser preference after hydration.
      setCollapsed(localStorage.getItem("katsodi.sidebar") === "hidden");
    } catch {
      /* Navigation still works without storage. */
    }
  }, []);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("katsodi.sidebar", next ? "hidden" : "visible");
    } catch {
      /* Keep the in-memory preference. */
    }
  }

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const nav = [
    { href: "/home", label: t.home, icon: Home },
    { href: "/rooms", label: t.rooms, icon: Compass },
    { href: "/network", label: t.network.catalog, icon: AudioLines },
    { href: "/fandoms", label: t.fandoms, icon: Sparkles },
    { href: "/music", label: t.topMusic, icon: ListMusic },
    { href: "/saved", label: t.saved, icon: Bookmark },
    { href: "/friends", label: t.design.connections, icon: Users },
  ];

  const authPage = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ].includes(pathname);
  if (pathname === "/overview")
    return (
      <OverviewLayout>
        {children}
        {searchOpen && <QuickSearch />}
        {(activeCompanion || currentRoom) && <CompanionDock />}
        <ConsentBanner />
      </OverviewLayout>
    );
  if (authPage)
    return (
      <div className="auth-shell">
        <a className="skip-link" href="#main">
          {t.skip}
        </a>
        <header className="auth-header">
          <Link href="/home" className="brand">
            <span className="brand-icon">
              <AudioLines size={23} />
            </span>
            katsodi<span className="brand-dot">.</span>
          </Link>
          <div className="auth-header-actions">
            <Link href="/home" className="auth-back">
              {t.network.backExplore}
              <ArrowUpRight size={16} />
            </Link>
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
          </div>
        </header>
        <DocumentTitle />
        <main id="main" tabIndex={-1} className="auth-main">
          {children}
        </main>
        <SiteFooter />
        <ConsentBanner />
      </div>
    );

  return (
    <div
      className={`app-shell brand-app ${collapsed ? "sidebar-collapsed" : ""}`}
    >
      <a className="skip-link" href="#main">
        {t.skip}
      </a>
      <aside className="sidebar" id="desktop-sidebar" inert={collapsed}>
        <Link href="/home" className="brand">
          <span className="brand-icon">
            <AudioLines size={23} />
          </span>{" "}
          katsodi<span className="brand-dot">.</span>
        </Link>
        <p className="brand-tagline">{t.tagline}</p>

        {/* Quick Search Button in Sidebar */}
        {/* The visible text is the accessible name (voice control can match
            it); the shortcut is announced via aria-keyshortcuts instead. */}
        <button
          className="sidebar-search-btn"
          onClick={toggleSearch}
          aria-keyshortcuts="Control+K"
        >
          <Search size={18} aria-hidden="true" />
          <span>{t.quickSearch}</span>
          <kbd className="sidebar-search-kbd" aria-hidden="true">
            {t.searchShortcut}
          </kbd>
        </button>

        <p className="nav-caption">{t.design.explore}</p>
        <nav aria-label={t.home}>
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                pathname === href ||
                pathname.startsWith(`${href}/`) ||
                (href === "/home" && pathname === "/")
                  ? "page"
                  : undefined
              }
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="little-orbit" />
          <p>{t.footer}</p>
          <Link href={backendConfigured ? "/network/create" : "/rooms/create"}>
            {t.create}
            <ArrowUpRight size={17} />
          </Link>
        </div>

        <div className="sidebar-bottom">
          <Link
            href="/settings"
            aria-current={pathname === "/settings" ? "page" : undefined}
          >
            <Settings2 size={20} />
            {t.settings}
          </Link>
          <Link href="/account" className="demo-profile">
            <UserAvatar
              className="avatar"
              userId={identity?.id}
              name={identity?.name || "K"}
              available={identity?.available ?? false}
              version={identity?.version}
            />
            <div>
              <strong>
                {identity?.name ||
                  (backendConfigured ? t.network.account : t.demo)}
              </strong>
              <small>
                {backendConfigured ? t.network.backendConnected : t.localOwner}
              </small>
            </div>
            <span className="tiny-label">v0.4</span>
          </Link>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-controls="desktop-sidebar"
            aria-expanded={!collapsed}
            aria-label={collapsed ? t.showSidebar : t.hideSidebar}
            title={collapsed ? t.showSidebar : t.hideSidebar}
          >
            {collapsed ? (
              <PanelLeftOpen size={21} />
            ) : (
              <PanelLeftClose size={21} />
            )}
          </button>
          <Link href="/home" className="mobile-brand">
            <AudioLines size={23} /> katsodi.
          </Link>

          {/* Topbar Center Search Trigger (like Liner / Modern Media Apps) */}
          <button
            className="topbar-search-trigger"
            onClick={toggleSearch}
            aria-keyshortcuts="Control+K"
          >
            <Search size={15} aria-hidden="true" />
            <span className="topbar-search-text">{t.searchPlaceholder}</span>
            <kbd className="topbar-search-kbd" aria-hidden="true">
              {t.searchShortcut}
            </kbd>
          </button>

          <span className="breadcrumb">{t.explore}</span>

          <div className="top-actions">
            <Link
              href="/account"
              className="account-access"
              aria-label={t.network.account}
            >
              <span>{t.network.account}</span>
              <UserAvatar
                iconFallback
                userId={identity?.id}
                name={identity?.name || "K"}
                available={identity?.available ?? false}
                version={identity?.version}
              />
            </Link>
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
            <Link
              className="button button-primary button-small"
              href={backendConfigured ? "/network/create" : "/rooms/create"}
              aria-label={t.create}
            >
              <Plus size={17} />
              <span>{t.create}</span>
            </Link>
          </div>
        </header>

        <DocumentTitle />
        <main id="main" tabIndex={-1}>
          {(pathname === "/home" ||
            /^\/(rooms|network|room)(\/|$)/.test(pathname)) && (
            <div className="demo-banner">
              <span className="status-dot" />
              <strong>
                {/* This banner also shows on local-draft pages, so it names
                    the connection, not a shared room. */}
                {backendConfigured ? t.network.backendConnected : t.demoBanner}
              </strong>
              <span>
                {backendConfigured ? t.network.connectedHint : t.demoExplain}
              </span>
            </div>
          )}
          {offline && (
            <p className="notice" role="status">
              <WifiOff size={18} />
              {t.offline}
            </p>
          )}
          {storageError && (
            <p className="notice error" role="alert">
              {t.storageError}
            </p>
          )}
          <div className="page-content" data-route={pathname}>
            {children}
          </div>
          <SiteFooter />
        </main>
      </div>

      <nav className="mobile-nav" aria-label={t.home}>
        {[
          ...nav.filter((item) =>
            ["/home", "/network", "/fandoms", "/saved"].includes(item.href),
          ),
          { href: "/settings", label: t.settings, icon: Settings2 },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
          >
            <Icon size={20} />
            <span>{href === "/network" ? t.rooms : label}</span>
          </Link>
        ))}
      </nav>

      {/* Quick Search Floating Popover */}
      {searchOpen && <QuickSearch />}

      {/* Floating Bottom Companion Dock */}
      {(activeCompanion || currentRoom) && <CompanionDock />}

      <ConsentBanner />
    </div>
  );
}
