"use client";
/* eslint-disable react-hooks/set-state-in-effect -- Hydrate browser-only storage after SSR and report persistence failures. No derived-state effects. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { z } from "zod";
import { messages, type Locale } from "@/lib/i18n";
import { storedRoomSchema, type LocalRoom } from "@/lib/rooms";
import { type CompanionTrack } from "@/lib/companion";

const stateSchema = z.object({
  rooms: z.array(storedRoomSchema).max(100),
  saved: z.array(z.string()).max(500),
  followed: z.array(z.string()).max(200),
});
type State = z.infer<typeof stateSchema>;
const empty: State = { rooms: [], saved: [], followed: [] };
const LocaleContext = createContext<Locale | null>(null);
const CurrentRoomContext = createContext<CurrentRoom | null | undefined>(
  undefined,
);

const Context = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (typeof messages)[Locale];
  ready: boolean;
  state: State;
  addRoom: (room: LocalRoom) => boolean;
  toggleSaved: (id: string) => void;
  toggleFandom: (id: string) => void;
  clear: () => void;
  storageError: boolean;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;
  activeCompanion: CompanionTrack | null;
  setActiveCompanion: (track: CompanionTrack | null) => void;
  companionExpanded: boolean;
  setCompanionExpanded: (expanded: boolean) => void;
  /** The room the user is in, shown by the bottom dock on every page. */
  currentRoom: CurrentRoom | null;
  setCurrentRoom: (room: CurrentRoom | null) => void;
} | null>(null);

export type CurrentRoom = {
  fandomId?: string | null;
  id: string;
  title: string;
  kind: "shared" | "local";
  art: "orbit" | "wave" | "moon" | "sun";
};
const currentRoomKey = "katsodi.currentRoom";
function readCurrentRoom(): CurrentRoom | null {
  try {
    const value = JSON.parse(localStorage.getItem(currentRoomKey) || "null");
    if (
      value &&
      typeof value.id === "string" &&
      value.id.length <= 64 &&
      typeof value.title === "string" &&
      ["shared", "local"].includes(value.kind) &&
      ["orbit", "wave", "moon", "sun"].includes(value.art)
    )
      return {
        id: value.id,
        title: value.title.slice(0, 80),
        kind: value.kind,
        fandomId:
          typeof value.fandomId === "string"
            ? value.fandomId.slice(0, 80)
            : null,
        art: value.art,
      };
  } catch {
    /* No stored room. */
  }
  return null;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>("ru");
  const [state, updateState] = useState<State>(empty);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeCompanion, setActiveCompanion] = useState<CompanionTrack | null>(
    null,
  );
  const [companionExpanded, setCompanionExpanded] = useState(false);
  const [currentRoom, updateCurrentRoom] = useState<CurrentRoom | null>(null);
  // Restore after hydration so a room entered from any page keeps its dock.
  useEffect(() => {
    updateCurrentRoom(readCurrentRoom());
  }, []);
  const setCurrentRoom = useCallback((room: CurrentRoom | null) => {
    updateCurrentRoom((previous) =>
      previous?.id === room?.id &&
      previous?.title === room?.title &&
      previous?.kind === room?.kind &&
      previous?.art === room?.art &&
      previous?.fandomId === room?.fandomId
        ? previous
        : room,
    );
    try {
      if (room) localStorage.setItem(currentRoomKey, JSON.stringify(room));
      else localStorage.removeItem(currentRoomKey);
    } catch {
      /* Keep the in-memory value. */
    }
  }, []);

  useEffect(() => {
    try {
      const storedLocale = localStorage.getItem("katsodi.locale");
      if (storedLocale === "en" || storedLocale === "ru")
        updateLocale(storedLocale);
      const raw = localStorage.getItem("katsodi.workspace.v1");
      if (raw) {
        const result = stateSchema.safeParse(JSON.parse(raw));
        if (result.success) updateState(result.data);
      }
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("katsodi.workspace.v1", JSON.stringify(state));
    } catch {
      setStorageError(true);
    }
  }, [state, ready]);

  // Native dialogs own Escape; the global shortcut only opens search.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "k" &&
        !companionExpanded
      ) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [searchOpen, companionExpanded]);

  function setLocale(value: Locale) {
    updateLocale(value);
    try {
      localStorage.setItem("katsodi.locale", value);
    } catch {
      setStorageError(true);
    }
  }

  function toggle(key: "saved" | "followed", id: string) {
    updateState((s) => ({
      ...s,
      [key]: s[key].includes(id)
        ? s[key].filter((x) => x !== id)
        : [...s[key], id],
    }));
  }

  return (
    <LocaleContext.Provider value={locale}>
      <CurrentRoomContext.Provider value={currentRoom}>
        <Context.Provider
          value={{
            locale,
            setLocale,
            t: messages[locale],
            state,
            ready,
            storageError,
            searchOpen,
            setSearchOpen,
            toggleSearch: () => setSearchOpen((prev) => !prev),
            activeCompanion,
            setActiveCompanion,
            companionExpanded,
            setCompanionExpanded,
            currentRoom,
            setCurrentRoom,
            addRoom: (room) => {
              if (state.rooms.length >= 100) return false;
              updateState((s) => ({
                ...s,
                rooms: [...s.rooms, room],
                saved: [...s.saved, room.id],
              }));
              return true;
            },
            toggleSaved: (id) => toggle("saved", id),
            toggleFandom: (id) => toggle("followed", id),
            clear: () => updateState(empty),
          }}
        >
          {children}
        </Context.Provider>
      </CurrentRoomContext.Provider>
    </LocaleContext.Provider>
  );
}

/** Read-only content need not rerender when browser storage or the dock changes. */
export function useLocale() {
  const locale = useContext(LocaleContext);
  if (!locale) throw new Error("WorkspaceProvider is required");
  return { locale, t: messages[locale] };
}

export function useCurrentRoom() {
  const room = useContext(CurrentRoomContext);
  if (room === undefined) throw new Error("WorkspaceProvider is required");
  return room;
}

export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("WorkspaceProvider is required");
  return value;
}
