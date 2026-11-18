"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  isDesktopShell,
  onDesktopResume,
  REVALIDATE_EVENT,
} from "@/lib/platform/desktop";
import { syncServiceWorker, watchInstall } from "@/lib/platform/install";

/**
 * Platform glue shared by the browser, the installed PWA and the desktop
 * shell. Renders nothing. The website works the same when no shell exists.
 */
export function PlatformRuntime() {
  const router = useRouter();
  useEffect(() => {
    const desktop = isDesktopShell();
    // Lets styles hide what makes no sense in the desktop window.
    if (desktop) document.documentElement.dataset.shell = "desktop";
    void syncServiceWorker({
      desktop,
      production: process.env.NODE_ENV === "production",
    });
    const stopInstall = desktop ? () => {} : watchInstall();
    // After sleep, old identity and room state must not be trusted: server
    // components are re-read and open rooms fetch a fresh snapshot.
    const stopResume = onDesktopResume(() => {
      window.dispatchEvent(new Event(REVALIDATE_EVENT));
      router.refresh();
    });
    return () => {
      stopInstall();
      stopResume();
    };
  }, [router]);
  return null;
}
