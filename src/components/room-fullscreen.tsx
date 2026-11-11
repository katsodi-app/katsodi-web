"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useLocale } from "./workspace-provider";

const TabCaptureContext = createContext<{
  setCapturing: Dispatch<SetStateAction<boolean>>;
  prepareCapture: () => Promise<void>;
  expanded: boolean;
  toggleExpanded: () => Promise<void>;
} | null>(null);

export function useRoomFullscreen() {
  return useContext(TabCaptureContext);
}

/** Only the room's own current-tab presenter enables this mode. */
export function useRoomTabCapture(capturing: boolean) {
  const capture = useContext(TabCaptureContext);
  const setCapturing = capture?.setCapturing;
  useEffect(() => {
    setCapturing?.(capturing);
    return () => setCapturing?.(false);
  }, [capturing, setCapturing]);
  return capture?.prepareCapture;
}

export function RoomFullscreen({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [nativeExpanded, setNativeExpanded] = useState(false);
  const [inPage, setInPage] = useState(false);
  const [tabCapture, setTabCapture] = useState(false);
  const expanded = nativeExpanded || inPage;
  const prepareCapture = useCallback(async () => {
    if (document.fullscreenElement === root.current) {
      setInPage(true);
      await document.exitFullscreen();
    }
  }, []);
  const wasExpanded = useRef(false);
  const [error, setError] = useState(false);
  const toggleExpanded = useCallback(async () => {
    setError(false);
    try {
      if (expanded) {
        setInPage(false);
        if (document.fullscreenElement === root.current)
          await document.exitFullscreen();
      } else if (tabCapture) setInPage(true);
      else if (root.current?.requestFullscreen)
        await root.current.requestFullscreen();
      else setError(true);
    } catch {
      setError(true);
    }
  }, [expanded, tabCapture]);
  const captureContext = useMemo(
    () => ({
      setCapturing: setTabCapture,
      prepareCapture,
      expanded,
      toggleExpanded,
    }),
    [prepareCapture, expanded, toggleExpanded],
  );
  useEffect(() => {
    const update = () => {
      const active = document.fullscreenElement === root.current;
      setNativeExpanded(active);
    };
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  useEffect(() => {
    if (wasExpanded.current && !expanded) trigger.current?.focus();
    wasExpanded.current = expanded;
  }, [expanded]);
  useEffect(() => {
    // Chromium's native fullscreen of a captured tab can letterbox the whole
    // page to the capture resolution. Keep the same media DOM in a viewport
    // overlay instead, including when capture starts after entering fullscreen.
    if (!tabCapture || !nativeExpanded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Switch away from native captured-tab fullscreen.
    setInPage(true);
    if (document.fullscreenElement === root.current)
      void document.exitFullscreen().catch(() => setError(true));
  }, [tabCapture, nativeExpanded]);
  useEffect(() => {
    if (!inPage || !root.current) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Keep navigation behind the overlay out of the keyboard/accessibility
    // tree, without moving or remounting the iframe and its crop target.
    const siblings: [HTMLElement, boolean][] = [];
    let ancestor: HTMLElement = root.current;
    while (ancestor.parentElement) {
      for (const sibling of ancestor.parentElement.children) {
        if (sibling !== ancestor && sibling instanceof HTMLElement) {
          siblings.push([sibling, sibling.inert]);
          sibling.toggleAttribute("inert", true);
        }
      }
      ancestor = ancestor.parentElement;
      if (ancestor === document.body) break;
    }
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !document.fullscreenElement
      )
        setInPage(false);
    };
    document.addEventListener("keydown", escape);
    trigger.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      for (const [sibling, inert] of siblings)
        sibling.toggleAttribute("inert", inert);
      document.removeEventListener("keydown", escape);
    };
  }, [inPage]);
  return (
    <TabCaptureContext.Provider value={captureContext}>
      <div
        ref={root}
        className={`room-fullscreen ${expanded ? "is-fullscreen" : ""}`}
        data-fullscreen-mode={
          inPage ? "page" : nativeExpanded ? "native" : undefined
        }
      >
        <div className="room-view-controls">
          <button
            ref={trigger}
            type="button"
            className="button button-secondary button-small"
            aria-pressed={expanded}
            onClick={() => void toggleExpanded()}
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {expanded ? t.platformUX.exitFullscreen : t.platformUX.fullscreen}
          </button>
          {error && (
            <span role="status">{t.platformUX.fullscreenUnavailable}</span>
          )}
        </div>
        {children}
      </div>
    </TabCaptureContext.Provider>
  );
}
