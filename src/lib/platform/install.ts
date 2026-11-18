/**
 * Installation of the website as an app (PWA). Browsers that support it fire
 * `beforeinstallprompt`; the event is kept so Settings can offer a real
 * button. No button is shown when the browser never offered installation.
 */
type InstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let prompt: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export type InstallState =
  | "installed" // running as an installed app
  | "available" // the browser offered installation
  | "ios" // iOS Safari: manual Add to Home Screen
  | "unavailable";

function standalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function iosBrowser(): boolean {
  const agent = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(agent) ||
    // iPadOS reports itself as a Mac with a touch screen.
    (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1)
  );
}

/** Stable strings, so the value works with useSyncExternalStore. */
export function installState(): InstallState {
  if (installed || standalone()) return "installed";
  if (prompt) return "available";
  if (iosBrowser()) return "ios";
  return "unavailable";
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Starts listening; call once, early. Returns a cleanup. */
export function watchInstall(): () => void {
  const offered = (event: Event) => {
    // Keep the browser's own mini-infobar from appearing unasked.
    event.preventDefault();
    prompt = event as InstallPromptEvent;
    notify();
  };
  const done = () => {
    prompt = null;
    installed = true;
    notify();
  };
  window.addEventListener("beforeinstallprompt", offered);
  window.addEventListener("appinstalled", done);
  return () => {
    window.removeEventListener("beforeinstallprompt", offered);
    window.removeEventListener("appinstalled", done);
  };
}

/** Shows the browser's install dialog. The event can be used only once. */
export async function requestInstall(): Promise<void> {
  const event = prompt;
  if (!event) return;
  prompt = null;
  notify();
  try {
    await event.prompt();
    await event.userChoice;
  } catch {
    /* The browser withdrew the offer. */
  }
}

/**
 * Registers the service worker (public/sw.js) in production browsers, and
 * removes it inside the desktop shell, which has its own recovery screen:
 * one cache controller per environment, never two.
 */
export async function syncServiceWorker(options: {
  desktop: boolean;
  production: boolean;
}): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    if (options.desktop || !options.production) {
      // Also cleans up after an earlier registration (or a production build
      // served on the development port), so HMR is never cached.
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations
          .filter((registration) =>
            (
              registration.active ??
              registration.waiting ??
              registration.installing
            )?.scriptURL.endsWith("/sw.js"),
          )
          .map((registration) => registration.unregister()),
      );
      return;
    }
    await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  } catch {
    /* Installation is optional; the site works without it. */
  }
}
