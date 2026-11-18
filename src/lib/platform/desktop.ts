import {
  BRIDGE_GLOBAL,
  isDesktopCapabilities,
  type DesktopBridge,
  type DesktopCapabilities,
} from "./bridge-contract";

/** Fired on `window` when shared room and identity state should be re-read. */
export const REVALIDATE_EVENT = "katsodi:revalidate";

/**
 * The desktop shell's bridge, or null in a browser or installed PWA. A page
 * script cannot be trusted to describe the shell, so the shape is checked and
 * anything unexpected counts as "no bridge".
 */
export function desktopBridge(): DesktopBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as unknown as Record<string, unknown>)[BRIDGE_GLOBAL];
  if (!bridge || typeof bridge !== "object") return null;
  const candidate = bridge as Partial<DesktopBridge>;
  return typeof candidate.getCapabilities === "function" &&
    typeof candidate.onNativeEvent === "function"
    ? (candidate as DesktopBridge)
    : null;
}

export const isDesktopShell = () => desktopBridge() !== null;

/** Capabilities of a compatible shell; null for none, old or unknown ones. */
export async function desktopCapabilities(): Promise<DesktopCapabilities | null> {
  const bridge = desktopBridge();
  if (!bridge) return null;
  try {
    const value = await bridge.getCapabilities();
    return isDesktopCapabilities(value) ? value : null;
  } catch {
    return null;
  }
}

/** Runs `listener` after the computer wakes up. Returns an unsubscribe. */
export function onDesktopResume(listener: () => void): () => void {
  const bridge = desktopBridge();
  if (!bridge) return () => {};
  try {
    const off = bridge.onNativeEvent((event) => {
      if (event?.type === "resume") listener();
    });
    return typeof off === "function" ? off : () => {};
  } catch {
    return () => {};
  }
}
