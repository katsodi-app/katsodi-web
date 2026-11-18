/**
 * Shared resource policy for the browser, the installed PWA and the desktop
 * shell. It decides how much optional work the interface does; it never
 * decides permissions or capabilities (a weak computer may still be allowed
 * to share its screen, a strong one may lack the permission).
 */
export const resourceModes = ["auto", "standard", "low"] as const;
export type ResourceMode = (typeof resourceModes)[number];
export type EffectiveResources = "standard" | "low";
export const RESOURCE_MODE_KEY = "katsodi.resourceMode";

export const isResourceMode = (value: unknown): value is ResourceMode =>
  resourceModes.includes(value as ResourceMode);

/**
 * Coarse hints only. Browsers round or omit them, so a missing hint means
 * "unknown", never "weak".
 */
export type ResourceSignals = {
  /** navigator.deviceMemory, in GiB (Chromium only, capped at 8). */
  deviceMemory?: number;
  hardwareConcurrency?: number;
  /** navigator.connection.saveData. */
  saveData?: boolean;
};

/** The user's explicit choice always wins over the hints. */
export function resolveResources(
  mode: ResourceMode,
  signals: ResourceSignals,
): EffectiveResources {
  if (mode !== "auto") return mode;
  if (signals.saveData === true) return "low";
  if (typeof signals.deviceMemory === "number" && signals.deviceMemory <= 2)
    return "low";
  if (
    typeof signals.hardwareConcurrency === "number" &&
    signals.hardwareConcurrency <= 2
  )
    return "low";
  return "standard";
}

export function readResourceSignals(): ResourceSignals {
  if (typeof navigator === "undefined") return {};
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  return {
    deviceMemory:
      typeof nav.deviceMemory === "number" ? nav.deviceMemory : undefined,
    hardwareConcurrency:
      typeof nav.hardwareConcurrency === "number"
        ? nav.hardwareConcurrency
        : undefined,
    saveData:
      typeof nav.connection?.saveData === "boolean"
        ? nav.connection.saveData
        : undefined,
  };
}

/** The mode applied to this document (set before paint by the bootstrap). */
export function effectiveResources(): EffectiveResources {
  if (typeof document === "undefined") return "standard";
  return document.documentElement.dataset.resources === "low"
    ? "low"
    : "standard";
}

/**
 * Motion is skipped when either the system asks for reduced motion or the
 * low-resource mode is on; neither setting re-enables what the other disabled.
 */
export function prefersLessMotion(): boolean {
  if (typeof window === "undefined") return false;
  return (
    effectiveResources() === "low" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Screen-capture constraints for a Link Demo. Low-resource mode asks the
 * browser for fewer and smaller frames before anything is encoded; the
 * standard mode leaves the browser's defaults.
 */
export function demoCaptureConstraints(
  resources: EffectiveResources,
): MediaTrackConstraints {
  return resources === "low"
    ? {
        frameRate: { max: 12 },
        width: { max: 1280 },
        height: { max: 720 },
      }
    : {};
}

// Static, allowlisted bootstrap that runs before paint, like the theme one.
// It mirrors resolveResources(); tests keep the two in step.
export const resourceBootstrap = `(function(){var r='standard';try{var m=localStorage.getItem('${RESOURCE_MODE_KEY}');if(m==='low'||m==='standard'){r=m;}else{var n=navigator,c=n.connection;if((c&&c.saveData===true)||(typeof n.deviceMemory==='number'&&n.deviceMemory<=2)||(typeof n.hardwareConcurrency==='number'&&n.hardwareConcurrency<=2))r='low';}}catch(e){}document.documentElement.dataset.resources=r;})();`;
