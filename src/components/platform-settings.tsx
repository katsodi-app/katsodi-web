"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Gauge } from "lucide-react";
import { desktopCapabilities, isDesktopShell } from "@/lib/platform/desktop";
import {
  installState,
  requestInstall,
  subscribeInstall,
  type InstallState,
} from "@/lib/platform/install";
import {
  isResourceMode,
  readResourceSignals,
  RESOURCE_MODE_KEY,
  resolveResources,
  resourceModes,
  type ResourceMode,
} from "@/lib/platform/performance-policy";
import { useWorkspace } from "./workspace-provider";

const modeListeners = new Set<() => void>();
function readMode(): ResourceMode {
  try {
    const stored = localStorage.getItem(RESOURCE_MODE_KEY);
    return isResourceMode(stored) ? stored : "auto";
  } catch {
    return "auto";
  }
}
function subscribeMode(listener: () => void) {
  modeListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    modeListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Applies a mode to this document; the choice survives reloads. */
function applyMode(mode: ResourceMode) {
  try {
    if (mode === "auto") localStorage.removeItem(RESOURCE_MODE_KEY);
    else localStorage.setItem(RESOURCE_MODE_KEY, mode);
  } catch {
    /* Storage is unavailable: the mode still applies to this page. */
  }
  document.documentElement.dataset.resources = resolveResources(
    mode,
    readResourceSignals(),
  );
  modeListeners.forEach((listener) => listener());
}

/** Settings: Auto, Standard or Low resource. */
export function PerformanceSettings() {
  const { t } = useWorkspace();
  const p = t.platform;
  const stored = useSyncExternalStore<ResourceMode>(
    subscribeMode,
    readMode,
    () => "auto",
  );
  // A choice that storage could not keep still shows for this page.
  const [unsaved, setUnsaved] = useState<ResourceMode | null>(null);
  const mode = unsaved ?? stored;
  const autoChoice = useSyncExternalStore(
    subscribeMode,
    () => resolveResources("auto", readResourceSignals()),
    () => "standard" as const,
  );
  const labels: Record<ResourceMode, string> = {
    auto: p.resourceAuto,
    standard: p.resourceStandard,
    low: p.resourceLow,
  };
  return (
    <section id="performance">
      <div>
        <h2>
          <Gauge size={17} aria-hidden="true" /> {p.performanceTitle}
        </h2>
        <p>{p.performanceHint}</p>
        {mode === "auto" && (
          <p className="settings-note" role="status">
            {autoChoice === "low" ? p.resourceAutoLow : p.resourceAutoStandard}
          </p>
        )}
      </div>
      <select
        aria-label={p.resourceMode}
        value={mode}
        onChange={(event) => {
          const next = event.target.value;
          if (!isResourceMode(next)) return;
          applyMode(next);
          setUnsaved(readMode() === next ? null : next);
        }}
      >
        {resourceModes.map((value) => (
          <option key={value} value={value}>
            {labels[value]}
          </option>
        ))}
      </select>
    </section>
  );
}

/**
 * Settings: install the site as an app, or say which app this already is.
 * The button appears only when the browser really offered installation.
 */
export function InstallSettings() {
  const { t } = useWorkspace();
  const p = t.platform;
  const state = useSyncExternalStore<InstallState | null>(
    subscribeInstall,
    installState,
    () => null,
  );
  // null: not known yet; "": a shell that reported nothing usable.
  const [desktop, setDesktop] = useState<string | null>(null);
  const [inShell, setInShell] = useState(false);
  useEffect(() => {
    if (!isDesktopShell()) return;
    let current = true;
    void desktopCapabilities().then((capabilities) => {
      if (!current) return;
      setInShell(true);
      setDesktop(capabilities?.appVersion ?? "");
    });
    return () => {
      current = false;
    };
  }, []);
  if (state === null) return null;
  const text = inShell
    ? desktop
      ? p.desktopInfo.replace("{version}", desktop)
      : p.desktopOld
    : state === "installed"
      ? p.installDone
      : state === "ios"
        ? p.installIos
        : state === "available"
          ? p.installHint
          : `${p.installHint} ${p.installUnavailable}`;
  return (
    <section id="app">
      <div>
        <h2>
          <Download size={17} aria-hidden="true" /> {p.installTitle}
        </h2>
        <p>{text}</p>
      </div>
      {!inShell && state === "available" && (
        <button
          className="button button-secondary"
          onClick={() => void requestInstall()}
        >
          {p.installButton}
        </button>
      )}
    </section>
  );
}
