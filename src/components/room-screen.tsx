"use client";
import { useEffect } from "react";
import { RoomFullscreen } from "./room-fullscreen";
import { RoomLayout } from "./room-layout";
import { MusicRoomGuide } from "./room-creation-design";
import { RoomVinyl } from "./room-vinyl";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import {
  ArrowLeft,
  AudioLines,
  Compass,
  Headphones,
  MessageCircle,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { RoomStage } from "./room-stage";
import { Empty } from "./state-screens";

export function RoomScreen({ id }: { id: string }) {
  const { t, state, ready, setCurrentRoom } = useWorkspace();
  const room = state.rooms.find((r) => r.id === id);
  const roomName = room?.name;
  const roomArt = room?.art;
  const fandomId = room?.fandomId;
  useEffect(() => {
    if (roomName && roomArt)
      setCurrentRoom({
        id,
        title: roomName,
        kind: "local",
        art: roomArt,
        fandomId,
      });
  }, [id, roomName, roomArt, fandomId, setCurrentRoom]);
  if (!ready) return <p role="status">{t.loading}</p>;
  if (!room)
    return (
      <>
        <Empty title={t.roomMissing} description={t.roomMissingHint} />
        <Link href="/rooms" className="button button-secondary">
          {t.seeAll}
        </Link>
      </>
    );
  return (
    <RoomFullscreen>
      <Link className="text-link" href="/rooms">
        <ArrowLeft size={16} />
        {t.rooms}
      </Link>
      <div className="page-heading">
        <RoomVinyl fandomId={room.fandomId} />
        <div>
          <p className="eyebrow">
            {t.preview} · {t[room.visibility]}
          </p>
          <h1>{room.name}</h1>
          <p>{room.description}</p>
        </div>
        <span className="pill">{t.local}</span>
      </div>
      <RoomLayout className="room-layout">
        <div className="room-main">
          {room.format === "music" && <MusicRoomGuide local />}
          <RoomStage
            fandomId={room.fandomId}
            art={room.art}
            format={room.format}
            url={room.url}
          />
        </div>
        <Tabs.Root className="room-panel" defaultValue="chat">
          <Tabs.List aria-label={t.roomDetails} className="tabs-list">
            {(["chat", "participants", "queue"] as const).map((tab) => (
              <Tabs.Trigger key={tab} value={tab}>
                {t[tab]}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <Tabs.Content value="chat">
            <MessageCircle size={34} />
            <p>{t.chatUnavailable}</p>
            <Link
              href="/network"
              className="button button-primary button-small"
            >
              {t.network.catalog}
            </Link>
          </Tabs.Content>
          <Tabs.Content value="participants">
            <Compass size={34} />
            <p>{t.membersUnavailable}</p>
          </Tabs.Content>
          <Tabs.Content value="queue">
            <AudioLines size={34} />
            <p>{t.queueUnavailable}</p>
          </Tabs.Content>
          <div className="room-panel-bottom">
            <Headphones size={18} />
            {t.voiceUnavailable}
          </div>
        </Tabs.Root>
      </RoomLayout>
      <p className="notice">
        {t.localHint} {t.inviteUnavailable}
      </p>
    </RoomFullscreen>
  );
}
