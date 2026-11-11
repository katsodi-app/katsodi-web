"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { adjacentTrack, validQueue, type QueueTrack } from "@/lib/music-queue";
import { useWorkspace } from "./workspace-provider";

const MusicDock = dynamic(
  () => import("./music-player-dock").then((m) => m.MusicPlayerDock),
  { ssr: false },
);
export type MusicSession = {
  tracks: QueueTrack[];
  index: number;
  collection: string;
  serial: number;
};
const PlayerContext = createContext<{
  currentId: string | null;
  start: (tracks: QueueTrack[], index: number, collection: string) => void;
} | null>(null);
export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MusicSession | null>(null);
  const serial = useRef(0);
  const { setActiveCompanion } = useWorkspace();
  const pathname = usePathname();
  useEffect(() => {
    // Entering a room hands playback back to its existing room player.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Router navigation ends an independent playback session to avoid simultaneous room audio.
    if (pathname.startsWith("/room/")) setSession(null);
  }, [pathname]);
  const start = useCallback(
    (tracks: QueueTrack[], index: number, collection: string) => {
      if (!validQueue(tracks) || !tracks[index]) return;
      setActiveCompanion(null);
      setSession({
        tracks: [...tracks],
        index,
        collection,
        serial: ++serial.current,
      });
    },
    [setActiveCompanion],
  );
  const currentId = session?.tracks[session.index]?.id || null;
  const value = useMemo(() => ({ currentId, start }), [currentId, start]);
  function move(direction: number) {
    setSession((previous) => {
      if (!previous) return previous;
      const index = adjacentTrack(
        previous.index,
        previous.tracks.length,
        direction,
      );
      return index === null
        ? previous
        : { ...previous, index, serial: ++serial.current };
    });
  }
  return (
    <PlayerContext.Provider value={value}>
      {children}
      {session && (
        <MusicDock
          key={session.serial}
          session={session}
          move={move}
          close={() => setSession(null)}
        />
      )}
    </PlayerContext.Provider>
  );
}
export function useMusicPlayer() {
  const value = useContext(PlayerContext);
  if (!value) throw new Error("MusicPlayerProvider is required");
  return value;
}
