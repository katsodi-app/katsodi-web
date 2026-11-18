/**
 * The versioned native contract between the Katsodi website and the desktop
 * shell (desktop/). Dependency-free on purpose: the web bundle, the Electron
 * main process and the sandboxed preload all import it.
 *
 * The website must work when no bridge exists, and must treat anything it
 * does not recognise as absent. The bridge grants no room, account or content
 * rights: authorization stays on the server.
 */
export const BRIDGE_PROTOCOL_VERSION = 1 as const;
/** Name of the object the preload exposes on `window`. */
export const BRIDGE_GLOBAL = "katsodiDesktop" as const;

export const desktopPlatforms = ["win32", "darwin", "linux"] as const;
export type DesktopPlatform = (typeof desktopPlatforms)[number];

export const desktopChannels = ["production", "development"] as const;
export type DesktopChannel = (typeof desktopChannels)[number];

/**
 * `picker`: screen sharing goes through the shell's own source picker.
 * `unavailable`: the shell cannot offer screen sharing on this system.
 */
export const desktopCaptureStates = ["picker", "unavailable"] as const;
export type DesktopCaptureState = (typeof desktopCaptureStates)[number];

export type DesktopCapabilities = Readonly<{
  protocolVersion: typeof BRIDGE_PROTOCOL_VERSION;
  appVersion: string;
  platform: DesktopPlatform;
  channel: DesktopChannel;
  desktopCapture: DesktopCaptureState;
  /** The shell sends no native notifications in protocol 1. */
  nativeNotifications: false;
}>;

/** `resume`: the computer woke up; revalidate identity and room state. */
export const desktopNativeEvents = ["resume"] as const;
export type DesktopNativeEvent = Readonly<{
  type: (typeof desktopNativeEvents)[number];
}>;

export type DesktopBridge = Readonly<{
  getCapabilities(): Promise<DesktopCapabilities>;
  /** Returns a working unsubscribe function. */
  onNativeEvent(listener: (event: DesktopNativeEvent) => void): () => void;
}>;

/** What the shell learns about the page to style its own local screens. */
export const appearanceLocales = ["ru", "en"] as const;
export type AppearanceLocale = (typeof appearanceLocales)[number];
export const appearanceThemes = [
  "obsidian",
  "ember",
  "aurora",
  "violet",
  "paper",
] as const;
export type AppearanceTheme = (typeof appearanceThemes)[number];
export type Appearance = Readonly<{
  locale: AppearanceLocale;
  theme: AppearanceTheme;
}>;

/** Fixed IPC channel names; the renderer never chooses a channel. */
export const channels = {
  getCapabilities: "katsodi:get-capabilities",
  nativeEvent: "katsodi:native-event",
  appearance: "katsodi:appearance",
  localState: "katsodi-local:state",
  localRetry: "katsodi-local:retry",
  pickerSources: "katsodi-local:picker-sources",
  pickerChoose: "katsodi-local:picker-choose",
  pickerCancel: "katsodi-local:picker-cancel",
} as const;

export function isAppearance(value: unknown): value is Appearance {
  if (!value || typeof value !== "object") return false;
  const keys = Object.keys(value);
  if (keys.length !== 2) return false;
  const { locale, theme } = value as Record<string, unknown>;
  return (
    appearanceLocales.includes(locale as AppearanceLocale) &&
    appearanceThemes.includes(theme as AppearanceTheme)
  );
}

export function isDesktopCapabilities(
  value: unknown,
): value is DesktopCapabilities {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.protocolVersion === BRIDGE_PROTOCOL_VERSION &&
    typeof v.appVersion === "string" &&
    v.appVersion.length <= 40 &&
    desktopPlatforms.includes(v.platform as DesktopPlatform) &&
    desktopChannels.includes(v.channel as DesktopChannel) &&
    desktopCaptureStates.includes(v.desktopCapture as DesktopCaptureState) &&
    v.nativeNotifications === false
  );
}
