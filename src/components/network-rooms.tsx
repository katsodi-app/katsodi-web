"use client";
import { matchesSearch } from "@/lib/search";
import { UserAvatar } from "./user-avatar";
import { RoomVinyl } from "./room-vinyl";
import { RoomFullscreen } from "./room-fullscreen";
import { RoomLayout } from "./room-layout";
import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  createNetworkRoom,
  joinNetworkRoom,
  createInvite,
  redeemInvite,
  moderateRoom,
  deleteMessage,
  revokeInvite,
  playFromQueue,
  pingRoomOccupancy,
} from "@/lib/server/room-actions";
import {
  initialResult,
  inviteTokenSchema,
  type ActionResult,
} from "@/lib/server/contracts";
import type {
  NetworkRoom,
  RoomSnapshot,
  InviteMeta,
} from "@/lib/server/network-data";
import { useWorkspace } from "./workspace-provider";
import { ActionStatus, BackendNotice } from "./account-forms";
import { FandomPicker } from "./fandom-picker";
import { roomPaletteStyle } from "./room-card";
import {
  RoomCreationHeading,
  RoomCreationPreview,
  RoomFormatPicker,
  RoomVisibilityPicker,
  MusicRoomGuide,
} from "./room-creation-design";
import { Cover } from "./room-card";
import { fandoms } from "@/lib/fandoms";
import { ChatComposer } from "./chat-composer";
import { ChatSticker } from "./chat-sticker";
import { RoomSourceForm } from "./room-source-form";
import { RoomStage } from "./room-stage";
import { VoiceLounge } from "./voice-lounge";
import { RoomQueue } from "./room-queue";
import { SharedBrowser } from "./shared-browser";
import { RoomWebsite } from "./room-website";
import { DemoStage } from "./demo-stage";
import { isStickerId } from "@/lib/chat-media";
import * as Tabs from "@radix-ui/react-tabs";
import { mergeRoomSnapshot, nearBottom } from "@/lib/room-sync";
import { useRoomSignal } from "@/lib/room-signal";
import { pingRoomPresence } from "@/lib/server/progression-actions";
import { PageIntro, StatePanel } from "./page-design";
import { authorColor } from "@/lib/annotations";
import type { CSSProperties } from "react";
import {
  Trash2,
  MessageCircle,
  Users,
  ArrowLeft,
  Headphones,
  ListMusic,
  Film,
  Globe,
  PanelTop,
  MonitorPlay,
} from "lucide-react";

export function NetworkCatalog({
  rooms,
  configured,
  signedIn,
  error = false,
}: {
  rooms: NetworkRoom[];
  configured: boolean;
  signedIn: boolean;
  error?: boolean;
}) {
  const { t } = useWorkspace();
  const n = t.network;
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState("all");
  // Clock for inactive rooms' deletion countdown, advanced each minute.
  const [now, setNow] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The clock is read after hydration.
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const filteredRooms = rooms.filter(
    (room) =>
      (format === "all" || room.format === format) &&
      matchesSearch(query, room.name, room.description),
  );
  return (
    <>
      <PageIntro
        eyebrow={t.design.roomsEyebrow}
        title={n.serverTitle}
        description={t.design.sharedHint}
        motif="rooms"
      >
        <Link
          className="button button-primary"
          href={signedIn ? "/network/create" : "/login?next=/network"}
        >
          {signedIn ? n.newRoom : n.login}
        </Link>
      </PageIntro>
      <div className="room-format-choices">
        <Link href="/network/create?format=music">
          <ListMusic size={24} />
          <strong>{t.musicLibrary.musicRoom}</strong>
          <span>{t.musicLibrary.musicRoomHint}</span>
        </Link>
        <Link href="/network/create?format=video">
          <Film size={24} />
          <strong>{t.musicLibrary.videoRoom}</strong>
          <span>{t.musicLibrary.videoRoomHint}</span>
        </Link>
      </div>
      {!configured ? (
        <BackendNotice />
      ) : error ? (
        <p className="notice" role="alert">
          {n.backendError}
        </p>
      ) : (
        <>
          <div className="filter-bar">
            <div className="chips">
              {(["all", "video", "music"] as const).map((key) => (
                <button
                  key={key}
                  className={`chip ${format === key ? "active" : ""}`}
                  aria-pressed={format === key}
                  onClick={() => setFormat(key)}
                >
                  {t[key]}
                </button>
              ))}
            </div>
            <label className="search-box">
              <span className="sr-only">{t.search}</span>
              <input
                placeholder={t.search}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>
          <div className="room-grid">
            {filteredRooms.map((room) => (
              <article
                className="room-card palette-room-card network-room-card"
                key={room.id}
                style={roomPaletteStyle(room.fandom_id)}
              >
                <Link href={`/room/${room.id}`}>
                  <Cover art={room.art} fandomId={room.fandom_id} />
                  <h2>{room.name}</h2>
                </Link>
                <p>{room.description}</p>
                <div className="network-room-tags">
                  <span>{t[room.format]}</span>
                  <span>{t[room.visibility]}</span>
                  <span>{n.serverBadge}</span>
                  <span>
                    {fandoms.find((item) => item.id === room.fandom_id)?.name ||
                      t.roomStudio.other}
                  </span>
                </div>
                {room.inactive_at && room.last_occupied_at && now > 0 && (
                  <span className="pill room-inactive">
                    {n.roomInactive} ·{" "}
                    {n.roomDeletesIn.replace(
                      "{minutes}",
                      String(
                        Math.max(
                          1,
                          Math.ceil(
                            (Date.parse(room.last_occupied_at) +
                              30 * 60000 -
                              now) /
                              60000,
                          ),
                        ),
                      ),
                    )}
                  </span>
                )}
              </article>
            ))}
          </div>
          {!filteredRooms.length && (
            <StatePanel
              title={rooms.length ? t.noResults : n.noRooms}
              description={t.design.sharedHint}
              motif="people"
            >
              <Link
                className="button button-primary"
                href={signedIn ? "/network/create" : "/login?next=/network"}
              >
                {signedIn ? n.newRoom : n.login}
              </Link>
            </StatePanel>
          )}
        </>
      )}
      <Link href="/rooms" className="text-link">
        {n.localDrafts}
      </Link>
    </>
  );
}
export function NetworkCreate({
  initialFandom = "",
  initialFormat = "video",
  importUrl = "",
  configured,
  signedIn,
}: {
  configured: boolean;
  signedIn: boolean;
  initialFandom?: string;
  initialFormat?: "video" | "music";
  /** A playlist or track to queue once the music room exists. */
  importUrl?: string;
}) {
  const { t } = useWorkspace();
  const n = t.network;
  const [format, setFormat] = useState<string>(initialFormat);
  const [draft, setDraft] = useState({
    fandomId: initialFandom,
    name: "",
    description: "",
    visibility: "public",
    url: "",
  });
  const [result, submit, pending] = useActionState(
    createNetworkRoom,
    initialResult,
  );
  return (
    <section className="form-page room-studio-page">
      <RoomCreationHeading title={n.newRoom} />
      <div className="create-layout">
        <div>
          {!configured ? (
            <BackendNotice />
          ) : !signedIn ? (
            <Link
              href={`/login?next=${encodeURIComponent(`/network/create${initialFandom ? `?fandom=${initialFandom}` : ""}`)}`}
              className="button button-primary"
            >
              {n.login}
            </Link>
          ) : (
            <form action={submit} className="form-card">
              <RoomFormatPicker value={format} onChange={setFormat} />
              <label>
                {t.name}
                <input
                  name="name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  minLength={3}
                  maxLength={80}
                  required
                />
              </label>
              <label>
                {t.description}
                <textarea
                  name="description"
                  maxLength={500}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </label>
              <p className="form-hint">
                {format === "music"
                  ? t.musicLibrary.musicRoomHint
                  : t.musicLibrary.videoRoomHint}
              </p>
              {importUrl && format === "music" && (
                <p className="form-hint">
                  <input type="hidden" name="import" value={importUrl} />
                  {n.importAfterCreate} <code>{importUrl}</code>
                </p>
              )}
              <RoomVisibilityPicker
                value={draft.visibility}
                onChange={(visibility) => setDraft({ ...draft, visibility })}
              />
              <FandomPicker
                value={draft.fandomId}
                onChange={(fandomId) => setDraft({ ...draft, fandomId })}
              />
              <label>
                {format === "music" ? t.roomStudio.musicSource : t.source}
                <input
                  value={draft.url}
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                  name="url"
                  type="url"
                  placeholder="https://…"
                  maxLength={2048}
                />
              </label>
              <input
                type="hidden"
                name="art"
                value={format === "music" ? "wave" : "orbit"}
              />
              {format !== "music" && <p>{t.player.sourceHint}</p>}
              {format === "music" && <MusicRoomGuide />}
              <button className="button button-primary" disabled={pending}>
                {pending ? n.pending : n.newRoom}
              </button>
              <ActionStatus result={result} />
            </form>
          )}
        </div>
        <RoomCreationPreview
          {...draft}
          format={format}
          visibility={draft.visibility as "public" | "private"}
        />
      </div>
    </section>
  );
}
function RoomAction({
  room,
  user,
  operation,
  children,
}: {
  room: string;
  user: string;
  operation: string;
  children: React.ReactNode;
}) {
  const { t } = useWorkspace();
  const [result, submit, pending] = useActionState(moderateRoom, initialResult);
  return (
    <form
      action={submit}
      onSubmit={(event) => {
        if (!window.confirm(t.network.confirmModeration))
          event.preventDefault();
      }}
    >
      <input type="hidden" name="room" value={room} />
      <input type="hidden" name="user" value={user} />
      <input type="hidden" name="operation" value={operation} />
      <button
        className="button button-secondary button-small"
        disabled={pending}
      >
        {children}
      </button>
      <ActionStatus result={result} />
    </form>
  );
}
function DeleteMessage({ id }: { id: string }) {
  const { t } = useWorkspace();
  const [result, submit, pending] = useActionState(
    deleteMessage,
    initialResult,
  );
  return (
    <form action={submit}>
      <input name="message" type="hidden" value={id} />
      <button
        disabled={pending}
        className="text-link"
        aria-label={t.network.deleteMessage}
      >
        <Trash2 size={13} />
      </button>
      <ActionStatus result={result} />
    </form>
  );
}
function RevokeInvitation({
  id,
  onSuccess,
}: {
  id: string;
  onSuccess?: () => void;
}) {
  const { t } = useWorkspace();
  const [result, submit, pending] = useActionState(
    async (prev: ActionResult, form: FormData) => {
      const response = await revokeInvite(prev, form);
      if (response.status === "success") onSuccess?.();
      return response;
    },
    initialResult,
  );
  return (
    <form action={submit}>
      <input type="hidden" name="invite" value={id} />
      <button
        className="button button-secondary button-small"
        disabled={pending || result.status === "success"}
      >
        {result.status === "success" ? t.network.revoked : t.network.revoke}
      </button>
      {result.status === "error" && <ActionStatus result={result} />}
    </form>
  );
}
function IssuedInvite({
  invite,
  origin,
}: {
  invite: { id: string; token: string };
  origin: string;
}) {
  const { t } = useWorkspace();
  const [revoked, setRevoked] = useState(false);
  return (
    <>
      {!revoked && (
        <>
          <label>
            {t.network.inviteLink}
            <input
              readOnly
              value={origin + "/join#" + invite.token}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
          <p>{t.network.copyHint}</p>
        </>
      )}
      <RevokeInvitation id={invite.id} onSuccess={() => setRevoked(true)} />
    </>
  );
}
function InvitePanel({
  room,
  invites,
}: {
  room: string;
  invites: InviteMeta[];
}) {
  const { t, locale } = useWorkspace();
  const n = t.network;
  const [result, submit, pending] = useActionState(createInvite, initialResult);
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Read the current browser origin after hydration.
    setOrigin(window.location.origin);
  }, []);
  return (
    <section className="form-card">
      <h2>{n.invite}</h2>
      <p>{n.inviteHint}</p>
      <form action={submit}>
        <input type="hidden" name="room" value={room} />
        <button className="button button-secondary" disabled={pending}>
          {n.invite}
        </button>
      </form>
      <ActionStatus result={result} />
      {result.invite && (
        <IssuedInvite
          key={result.invite.id}
          invite={result.invite}
          origin={origin}
        />
      )}
      <ul className="invite-list">
        {invites
          .filter((invite) => invite.id !== result.invite?.id)
          .map((invite) => (
            <li key={invite.id}>
              <time dateTime={invite.expires_at}>
                {new Date(invite.expires_at).toLocaleString(locale, {
                  timeZone: "UTC",
                })}{" "}
                UTC
              </time>
              <span>
                {invite.uses}/{invite.max_uses}
              </span>
              <RevokeInvitation id={invite.id} />
            </li>
          ))}
      </ul>
    </section>
  );
}
function ChatImage({ id }: { id: string }) {
  const { t } = useWorkspace();
  const [failed, setFailed] = useState(false);
  return failed ? (
    <p className="chat-image-unavailable">{t.network.imageUnavailable}</p>
  ) : (
    <a
      href={`/api/chat-images/${id}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.network.openImage}
      className="chat-image-link"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Authenticated no-store image endpoint must not go through the public Next optimizer. */}
      <img
        src={`/api/chat-images/${id}`}
        alt={t.network.chatImage}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </a>
  );
}
export function SharedRoom({
  initial,
  creationImportFailed = false,
}: {
  initial: RoomSnapshot;
  creationImportFailed?: boolean;
}) {
  const { t, locale, currentRoom, setCurrentRoom } = useWorkspace();
  const n = t.network;
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(initial);
  // When the current snapshot arrived; anchors playback extrapolation.
  const [receivedAt, setReceivedAt] = useState(() => performance.now());
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [tab, setTab] = useState<"chat" | "people" | "voice" | "queue">("chat");
  const [stageChoice, setStageChoice] = useState<
    "auto" | "player" | "site" | "demo" | "browser"
  >("auto");
  // A website that refused embedding, handed to the shared browser's form.
  const [browserPrefill, setBrowserPrefill] = useState("");
  // Stable, so panels can request a refresh from effects without loops.
  const refreshRoom = useCallback(() => setRefresh((value) => value + 1), []);
  // Presence heartbeat for XP: joined members of an open room, visible tab
  // only. The server counts at most one minute per 50 seconds.
  const presenceActive =
    !!snapshot?.joined && !snapshot.room.closed_at && !!snapshot.userId;
  useEffect(() => {
    if (!presenceActive) return;
    const ping = () => {
      if (document.hidden) return;
      const form = new FormData();
      form.set("room", initial.room.id);
      void pingRoomPresence(initialResult, form).catch(() => {});
    };
    ping();
    const timer = window.setInterval(ping, 60000);
    return () => window.clearInterval(timer);
  }, [presenceActive, initial.room.id]);
  // Occupancy (Task 3.1): the room stays alive while its page is open, in
  // any tab state; 10 empty minutes mark it inactive, 30 delete it.
  useEffect(() => {
    if (!presenceActive) return;
    const ping = () => {
      const form = new FormData();
      form.set("room", initial.room.id);
      void pingRoomOccupancy(initialResult, form).catch(() => {});
    };
    ping();
    const timer = window.setInterval(ping, 30000);
    return () => window.clearInterval(timer);
  }, [presenceActive, initial.room.id]);
  // Host's player ended: start the next queued link (once per 5 seconds).
  const lastAdvance = useRef(0);
  const advanceQueue = useCallback(async () => {
    if (Date.now() - lastAdvance.current < 5000) return;
    lastAdvance.current = Date.now();
    const form = new FormData();
    form.set("room", initial.room.id);
    const result = await playFromQueue(initialResult, form);
    if (result.status === "success") refreshRoom();
  }, [initial.room.id, refreshRoom]);
  const [joinResult, join, pending] = useActionState(
    joinNetworkRoom,
    initialResult,
  );
  const roomId = initial.room.id;
  // Latest applied snapshot, read by the poller to build its `after` cursor.
  const current = useRef<RoomSnapshot | null>(initial);
  // Realtime signals trigger an immediate refresh; polling remains the
  // fallback and slows down while the subscription is live.
  const refreshNow = useRef<() => void>(() => {});
  const live = useRoomSignal(roomId, () => refreshNow.current());
  const liveRef = useRef(live);
  useEffect(() => {
    liveRef.current = live;
  }, [live]);
  useEffect(() => {
    const controller = new AbortController();
    let stopped = false;
    let inFlight = false;
    let again = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const request = (after?: string) =>
      fetch(
        `/api/rooms/${roomId}${after ? `?after=${encodeURIComponent(after)}` : ""}`,
        { cache: "no-store", signal: controller.signal },
      );
    const load = async () => {
      if (inFlight) {
        // A signal during a refresh must not be lost: run once more after.
        again = true;
        return;
      }
      inFlight = true;
      again = false;
      clearTimeout(timer);
      try {
        const after = current.current?.messages.at(-1)?.id;
        let response = await request(after);
        let data: RoomSnapshot | null = response.ok
          ? await response.json()
          : null;
        let next = data && mergeRoomSnapshot(current.current, data);
        if (data && !next) {
          // The delta did not line up with what is on screen: resync fully.
          response = await request();
          data = response.ok ? await response.json() : null;
          next = data;
        }
        if (stopped) return;
        if (!next) {
          // Only lost access hides the room; transient failures keep the last
          // snapshot so chat stays readable and the voice call stays mounted.
          if (response.status === 404 || response.status === 401) {
            current.current = null;
            setSnapshot(null);
            setError("access");
          } else setError("network");
          return;
        }
        current.current = next;
        setSnapshot(next);
        setReceivedAt(performance.now());
        setError("");
      } catch {
        if (!stopped) setError("network");
      } finally {
        inFlight = false;
        // Hidden tabs stop polling; becoming visible refreshes immediately.
        if (!stopped && !document.hidden)
          timer = setTimeout(load, again ? 0 : liveRef.current ? 15000 : 3000);
      }
    };
    const visibility = () => {
      if (document.hidden) clearTimeout(timer);
      else void load();
    };
    document.addEventListener("visibilitychange", visibility);
    refreshNow.current = () => {
      if (!stopped && !document.hidden) void load();
    };
    void load();
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", visibility);
      controller.abort();
      clearTimeout(timer);
    };
  }, [roomId, refresh]);
  const chat = useRef<HTMLOListElement>(null);
  // Follow new messages only while the reader is at the bottom (or just sent
  // one); someone scrolled up to read history is not pulled away.
  const following = useRef(true);
  const last = snapshot?.messages.at(-1);
  const lastId = last?.id;
  const lastIsMine = !!last && last.sender_id === snapshot?.userId;
  useEffect(() => {
    if (!following.current && !lastIsMine) return;
    chat.current?.scrollTo({ top: chat.current.scrollHeight });
    following.current = true;
  }, [lastId, lastIsMine]);
  // The bottom dock follows the room the user is in, on every page; it
  // disappears when they leave, are removed or the room closes.
  const dockId =
    snapshot?.joined && !snapshot.room.closed_at ? snapshot.room.id : null;
  const dockTitle = snapshot?.room.name ?? "";
  const dockArt = snapshot?.room.art ?? "orbit";
  const dockFandom = snapshot?.room.fandom_id;
  const pageRoom = initial.room.id;
  const currentId = currentRoom?.id;
  useEffect(() => {
    if (dockId)
      setCurrentRoom({
        id: dockId,
        title: dockTitle,
        kind: "shared",
        art: dockArt,
        fandomId: dockFandom,
      });
    else if (currentId === pageRoom) setCurrentRoom(null);
  }, [
    dockId,
    dockTitle,
    dockArt,
    dockFandom,
    currentId,
    pageRoom,
    setCurrentRoom,
  ]);
  if (!snapshot)
    return (
      <p role="alert" className="notice">
        {n.unavailable}
      </p>
    );
  const { room, members, messages, profiles, userId, joined } = snapshot;
  const mine = members.find((m) => m.user_id === userId);
  const canHost = mine?.role === "owner" || mine?.role === "moderator";
  const canSwitch =
    canHost || (room.format === "music" && mine?.status === "active");
  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile]),
  );
  const nameOf = (id: string) => profilesById.get(id)?.display_name || n.member;
  const active = joined ? tab : "chat";
  // Shared browser: shown when configured, for members of an open room.
  // Until someone picks a side, the room follows the session automatically.
  const browserAvailable =
    room.format !== "music" &&
    joined &&
    !room.closed_at &&
    snapshot.browser !== undefined;
  // Room website: shown when its migration is applied, for members.
  const siteAvailable =
    room.format !== "music" &&
    joined &&
    !room.closed_at &&
    snapshot.site !== undefined;
  // Link demos: shown when LiveKit and the demo migration are available.
  const demoAvailable =
    joined && !room.closed_at && snapshot.demo !== undefined;
  const demoRunning = !!snapshot.demo && snapshot.demo.status !== "pending";
  const hostIds = members
    .filter((m) => m.role === "owner" || m.role === "moderator")
    .map((m) => m.user_id);
  const modes = [
    ...(demoAvailable ? (["demo"] as const) : []),
    "player" as const,
    ...(siteAvailable ? (["site"] as const) : []),
    ...(browserAvailable ? (["browser"] as const) : []),
  ];
  const auto = demoRunning
    ? "demo"
    : snapshot.browser
      ? "browser"
      : snapshot.site && !room.url
        ? "site"
        : "player";
  const chosen = stageChoice === "auto" ? auto : stageChoice;
  const stage = (modes as string[]).includes(chosen) ? chosen : "player";
  return (
    <RoomFullscreen>
      <div className="room-workspace">
        {creationImportFailed && (
          <p role="alert" className="error">
            {n.creationImportFailed}
          </p>
        )}
        <header className="room-bar">
          <RoomVinyl fandomId={room.fandom_id} />
          <Link
            href="/network"
            className="room-bar-back"
            aria-label={n.catalog}
            title={n.catalog}
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="room-bar-title">
            <h1>{room.name}</h1>
            {room.description && <p>{room.description}</p>}
          </div>
          <div className="room-bar-meta">
            <span className="room-chip">
              {n.serverBadge} · {t[room.visibility]}
            </span>
            {room.closed_at && (
              <span className="room-chip room-chip-closed">{n.closed}</span>
            )}
            {joined && (
              <span className="room-chip">
                <Users size={14} />
                {members.length}
              </span>
            )}
          </div>
        </header>
        {error === "network" && (
          <p role="status" className="notice room-notice">
            {n.refreshFailed}
          </p>
        )}
        <RoomLayout>
          <div className="room-main">
            {demoAvailable &&
              canHost &&
              snapshot.demo?.status === "pending" &&
              snapshot.demo.user_id !== userId &&
              stage !== "demo" && (
                <div className="demo-request-bar" role="status">
                  <MonitorPlay size={17} />
                  <span>
                    <strong>{nameOf(snapshot.demo.user_id)}</strong>{" "}
                    {n.demoPendingHost}
                  </span>
                  <button
                    type="button"
                    className="button button-small button-primary"
                    onClick={() => setStageChoice("demo")}
                  >
                    {n.demoReview}
                  </button>
                </div>
              )}
            {modes.length > 1 && (
              <div
                className="stage-switch"
                role="group"
                aria-label={n.stageSwitch}
              >
                {modes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={stage === mode}
                    onClick={() => setStageChoice(mode)}
                  >
                    {mode === "player" ? (
                      room.format === "music" ? (
                        <Headphones size={15} />
                      ) : (
                        <Film size={15} />
                      )
                    ) : mode === "site" ? (
                      <PanelTop size={15} />
                    ) : mode === "demo" ? (
                      <MonitorPlay size={15} />
                    ) : (
                      <Globe size={15} />
                    )}
                    {mode === "player"
                      ? n.stagePlayer
                      : mode === "site"
                        ? n.stageSite
                        : mode === "demo"
                          ? n.stageDemo
                          : n.stageBrowser}
                    {((mode === "browser" && snapshot.browser) ||
                      (mode === "site" && snapshot.site) ||
                      (mode === "demo" && demoRunning)) && (
                      <span className="stage-live" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="stage-pane" hidden={stage !== "player"}>
              {room.format === "music" && <MusicRoomGuide />}
              <RoomStage
                fandomId={room.fandom_id}
                art={room.art}
                format={room.format}
                url={room.url}
                roomId={room.id}
                enabled={joined && !room.closed_at}
                sync={{
                  roomUrl: room.url,
                  playback: snapshot.playback,
                  receivedAt,
                  // Music rooms: any member controls playback (migration 2200).
                  canControl: canSwitch,
                  onEnded:
                    canSwitch && snapshot.queue?.length
                      ? advanceQueue
                      : undefined,
                }}
              />
              {joined && !room.closed_at && canSwitch && (
                <RoomSourceForm
                  id={room.id}
                  music={room.format === "music"}
                  url={room.url}
                  available={room.source_updated_at !== undefined}
                />
              )}
            </div>
            {siteAvailable && (
              <div className="stage-pane" hidden={stage !== "site"}>
                <RoomWebsite
                  roomId={room.id}
                  site={snapshot.site ?? null}
                  canHost={canHost}
                  sharedBrowser={browserAvailable}
                  onOpenInBrowser={(url) => {
                    setBrowserPrefill(url);
                    setStageChoice("browser");
                  }}
                  onChanged={refreshRoom}
                />
              </div>
            )}
            {demoAvailable && (
              <div className="stage-pane" hidden={stage !== "demo"}>
                <DemoStage
                  roomId={room.id}
                  demo={snapshot.demo ?? null}
                  userId={userId ?? ""}
                  canHost={canHost}
                  hostIds={hostIds}
                  active={stage === "demo"}
                  nameOf={nameOf}
                  onChanged={refreshRoom}
                />
              </div>
            )}
            {browserAvailable && (
              <div className="stage-pane" hidden={stage !== "browser"}>
                <SharedBrowser
                  roomId={room.id}
                  browser={snapshot.browser ?? null}
                  canHost={canHost}
                  onChanged={refreshRoom}
                  initialUrl={browserPrefill}
                />
              </div>
            )}
          </div>
          <Tabs.Root
            className="room-side"
            value={active}
            onValueChange={(value) => setTab(value as typeof tab)}
          >
            {joined && (
              <Tabs.List className="room-tabs" aria-label={n.roomTabs}>
                <Tabs.Trigger value="chat">
                  <MessageCircle size={16} />
                  {t.chat}
                </Tabs.Trigger>
                <Tabs.Trigger value="people">
                  <Users size={16} />
                  {n.tabPeople}
                  <span className="room-tab-count">{members.length}</span>
                </Tabs.Trigger>
                {!room.closed_at && (
                  <Tabs.Trigger value="voice">
                    <Headphones size={16} />
                    {n.tabVoice}
                  </Tabs.Trigger>
                )}
                {snapshot.queue && !room.closed_at && (
                  <Tabs.Trigger value="queue">
                    <ListMusic size={16} />
                    {n.tabQueue}
                    {snapshot.queue.length > 0 && (
                      <span className="room-tab-count">
                        {snapshot.queue.length}
                      </span>
                    )}
                  </Tabs.Trigger>
                )}
              </Tabs.List>
            )}
            {/* Panels stay mounted so switching tabs never drops a voice call
              or loses a chat draft; inactive panels are only hidden. */}
            <Tabs.Content
              value="chat"
              forceMount
              hidden={active !== "chat"}
              className="room-panel-chat shared-chat room-chat-panel"
            >
              {!joined ? (
                <div className="room-join">
                  <MessageCircle size={28} strokeWidth={1.4} />
                  <p>{n.joinHint}</p>
                  {userId ? (
                    <form action={join}>
                      <input type="hidden" name="room" value={room.id} />
                      <button
                        className="button button-primary"
                        disabled={pending}
                      >
                        {n.join}
                      </button>
                      <ActionStatus result={joinResult} />
                    </form>
                  ) : (
                    <Link
                      className="button button-primary"
                      href={`/login?next=/room/${room.id}`}
                    >
                      {n.login}
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <ol
                    className="chat-messages"
                    ref={chat}
                    onScroll={(event) => {
                      following.current = nearBottom(event.currentTarget);
                    }}
                    aria-label={t.chat}
                    aria-live="polite"
                  >
                    {messages.map((message, index) => {
                      const previous = messages[index - 1];
                      // Consecutive messages from one person within 5 minutes
                      // read as one block: name and avatar only on the first.
                      const continued =
                        previous?.sender_id === message.sender_id &&
                        Date.parse(message.created_at) -
                          Date.parse(previous.created_at) <
                          300000;
                      const role = members.find(
                        (m) => m.user_id === message.sender_id,
                      )?.role;
                      return (
                        <li
                          key={message.id}
                          className={[
                            "chat-message",
                            message.sender_id === userId && "message-own",
                            continued && "message-continued",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          style={
                            {
                              "--author": authorColor(message.sender_id),
                            } as CSSProperties
                          }
                        >
                          <UserAvatar
                            className="message-avatar"
                            userId={message.sender_id}
                            name={nameOf(message.sender_id)}
                            available={
                              !!profilesById.get(message.sender_id)?.avatar_path
                            }
                            version={
                              profilesById.get(message.sender_id)
                                ?.media_updated_at
                            }
                          />
                          <div className="message-content">
                            <div className="message-meta">
                              <strong>{nameOf(message.sender_id)}</strong>
                              {(role === "owner" || role === "moderator") && (
                                <span className={`message-role role-${role}`}>
                                  {n[role]}
                                </span>
                              )}
                              <time dateTime={message.created_at}>
                                {new Date(
                                  message.created_at,
                                ).toLocaleTimeString(locale, {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: "UTC",
                                })}{" "}
                                UTC
                              </time>
                            </div>
                            {message.kind === "sticker" &&
                            isStickerId(message.sticker_id) ? (
                              <ChatSticker
                                id={message.sticker_id}
                                label={n[`sticker${message.sticker_id}`]}
                              />
                            ) : message.kind === "image" ? (
                              <ChatImage id={message.id} />
                            ) : (
                              <p className="message-bubble">{message.body}</p>
                            )}
                            {(message.sender_id === userId || canHost) && (
                              <DeleteMessage id={message.id} />
                            )}
                          </div>
                        </li>
                      );
                    })}
                    {!messages.length && (
                      <li className="chat-empty">
                        <MessageCircle size={32} strokeWidth={1.3} />
                        <strong>{n.emptyChat}</strong>
                        <p>{n.chatWelcome}</p>
                      </li>
                    )}
                  </ol>
                  {room.closed_at ? (
                    <p className="room-closed-note">{n.closed}</p>
                  ) : (
                    <ChatComposer
                      room={room.id}
                      demoEnabled={demoAvailable && !snapshot.demo}
                      onDemo={() => {
                        setStageChoice("demo");
                        refreshRoom();
                      }}
                      mediaEnabled={!!snapshot.mediaEnabled}
                      onSent={() => setRefresh((value) => value + 1)}
                    />
                  )}
                </>
              )}
            </Tabs.Content>
            {joined && (
              <Tabs.Content
                value="people"
                forceMount
                hidden={active !== "people"}
                className="room-panel-people shared-members"
              >
                <h2 className="room-panel-title">
                  {n.members} · {members.length}
                </h2>
                <ul className="member-list">
                  {members.map((member) => (
                    <li className="member-row" key={member.user_id}>
                      <span className="member-identity">
                        <UserAvatar
                          className="member-avatar"
                          userId={member.user_id}
                          name={nameOf(member.user_id)}
                          available={
                            !!profilesById.get(member.user_id)?.avatar_path
                          }
                          version={
                            profilesById.get(member.user_id)?.media_updated_at
                          }
                        />
                        <span className="member-details">
                          <strong>{nameOf(member.user_id)}</strong>
                          <small>{n[member.role]}</small>
                        </span>
                      </span>
                      <div className="member-actions">
                        {mine?.role === "owner" && member.role !== "owner" && (
                          <RoomAction
                            room={room.id}
                            user={member.user_id}
                            operation={
                              member.role === "moderator" ? "demote" : "promote"
                            }
                          >
                            {member.role === "moderator" ? n.demote : n.promote}
                          </RoomAction>
                        )}
                        {(mine?.role === "owner" ||
                          (mine?.role === "moderator" &&
                            member.role === "member")) &&
                          member.user_id !== userId &&
                          member.role !== "owner" && (
                            <RoomAction
                              room={room.id}
                              user={member.user_id}
                              operation="kick"
                            >
                              {n.kick}
                            </RoomAction>
                          )}
                      </div>
                    </li>
                  ))}
                </ul>
                {mine?.role === "owner" && !room.closed_at && (
                  <InvitePanel room={room.id} invites={snapshot.invites} />
                )}
                {userId && (
                  <div className="room-leave">
                    <RoomAction
                      room={room.id}
                      user={userId}
                      operation={mine?.role === "owner" ? "close" : "leave"}
                    >
                      {mine?.role === "owner" ? n.closeRoom : n.leave}
                    </RoomAction>
                  </div>
                )}
              </Tabs.Content>
            )}
            {joined && !room.closed_at && (
              <Tabs.Content
                value="voice"
                forceMount
                hidden={active !== "voice"}
                className="room-panel-voice"
              >
                <VoiceLounge roomId={room.id} profiles={profiles} />
              </Tabs.Content>
            )}
            {joined && !room.closed_at && snapshot.queue && (
              <Tabs.Content
                value="queue"
                forceMount
                hidden={active !== "queue"}
                className="room-panel-queue"
              >
                <RoomQueue
                  roomId={room.id}
                  queue={snapshot.queue}
                  canHost={canHost}
                  userId={userId}
                  onChanged={refreshRoom}
                  format={room.format === "music" ? "music" : "video"}
                />
              </Tabs.Content>
            )}
          </Tabs.Root>
        </RoomLayout>
      </div>
    </RoomFullscreen>
  );
}
export function JoinInvitation({
  configured,
  signedIn,
}: {
  configured: boolean;
  signedIn: boolean;
}) {
  const { t } = useWorkspace();
  const n = t.network;
  const [token, setToken] = useState("");
  const [result, submit, pending] = useActionState(redeemInvite, initialResult);
  useEffect(() => {
    let candidate = window.location.hash.slice(1);
    try {
      if (!candidate)
        candidate = sessionStorage.getItem("katsodi.pendingInvite") || "";
      if (inviteTokenSchema.safeParse(candidate).success)
        sessionStorage.setItem("katsodi.pendingInvite", candidate);
    } catch {
      /* The fragment still works with browser storage disabled. */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore a tab-scoped invitation after hydration.
    setToken(inviteTokenSchema.safeParse(candidate).success ? candidate : "");
  }, []);
  return (
    <section className="invitation-page">
      <PageIntro
        eyebrow={t.design.invitationEyebrow}
        title={n.invitation}
        description={t.design.invitationHint}
        motif="people"
      />
      <div className="invitation-body">
        {!configured ? (
          <BackendNotice />
        ) : !token ? (
          <p>{n.inviteMissing}</p>
        ) : !signedIn ? (
          <Link className="button button-primary" href="/login?next=/join">
            {n.login}
          </Link>
        ) : (
          <form className="form-card" action={submit}>
            <input type="hidden" name="token" value={token} />
            <p>{n.inviteHint}</p>
            <button className="button button-primary" disabled={pending}>
              {pending ? n.pending : n.accept}
            </button>
            <ActionStatus result={result} />
          </form>
        )}
      </div>
    </section>
  );
}
