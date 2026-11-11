"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useWorkspace } from "./workspace-provider";

/**
 * Names the browser tab after the current screen in the interface language.
 * The language lives in the browser, so server metadata cannot follow it.
 * Routes with their own server metadata (legal pages, music, overview) and
 * unknown paths keep their server title.
 */
export function DocumentTitle() {
  const { t, locale } = useWorkspace();
  const pathname = usePathname();
  useEffect(() => {
    const p = t.pageTitles;
    const routes: [RegExp, string][] = [
      [/^\/(home)?$/, t.home],
      [/^\/rooms\/create$/, p.roomsCreate],
      [/^\/rooms$/, t.rooms],
      [/^\/network\/create$/, p.networkCreate],
      [/^\/network$/, t.network.catalog],
      [/^\/room\/[^/]+$/, p.room],
      [/^\/saved$/, t.saved],
      [/^\/fandoms\/request$/, p.fandomRequest],
      [/^\/fandoms\/[^/]+$/, p.fandom],
      [/^\/fandoms$/, t.fandoms],
      [/^\/friends$/, t.design.connections],
      [/^\/account$/, p.account],
      [/^\/profile\/[^/]+$/, p.profile],
      [/^\/onboarding$/, p.onboarding],
      [/^\/settings$/, t.settings],
      [/^\/login$/, p.login],
      [/^\/signup$/, p.signup],
      [/^\/verify-email$/, p.verifyEmail],
      [/^\/forgot-password$/, p.forgotPassword],
      [/^\/reset-password$/, p.resetPassword],
      [/^\/join$/, p.join],
      [/^\/moderation$/, p.moderation],
      [/^\/credits$/, p.credits],
    ];
    const label = routes.find(([pattern]) => pattern.test(pathname))?.[1];
    if (!label) return;
    const title = `${label} · Katsodi`;
    const apply = () => {
      if (document.title !== title) document.title = title;
    };
    apply();
    // Next writes the streamed metadata <title> after hydration and on each
    // navigation; re-apply ours whenever the head changes it.
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [pathname, locale, t]);
  return null;
}
