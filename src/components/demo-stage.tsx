"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  CirclePause,
  CirclePlay,
  Eraser,
  ExternalLink,
  Highlighter,
  MonitorPlay,
  MousePointerClick,
  MoveUpRight,
  Pencil,
  Pointer as PointerIcon,
  RectangleHorizontal,
  Square,
  Trash2,
  Type,
  Undo2,
  Users,
  Volume2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type {
  LocalTrackPublication,
  Room as LiveKitRoom,
} from "livekit-client";
import {
  beatDemo,
  decideDemo,
  pauseDemo,
  setDemoAnnotations,
  stopDemo,
} from "@/lib/server/room-actions";
import { initialResult } from "@/lib/server/contracts";
import { siteEmbeddingSchema } from "@/lib/server/site-embed-schema";
import { canPresentDemo, type RoomDemo } from "@/lib/demo";
import {
  applyAnnotation,
  demoSignal,
  stampKinds,
  type DemoSignal,
  type Mark,
} from "@/lib/annotations";
import { ActionStatus } from "./account-forms";
import { DemoOverlay, type AnnotationTool, type Pointer } from "./demo-overlay";
import { useWorkspace } from "./workspace-provider";
import { ExternalMedia, hostLabel } from "./external-media";
import { useRoomTabCapture, useRoomFullscreen } from "./room-fullscreen";
import { useStageWithChat } from "./room-layout";
import type { ActionResult } from "@/lib/server/contracts";

type CropCapable = MediaStreamTrack & {
  cropTo?: (target: unknown) => Promise<void>;
};
type CropTargetApi = { fromElement(element: Element): Promise<unknown> };
type Mode = "checking" | "in-app" | "window";

const form = (roomId: string, extra: Record<string, string> = {}) => {
  const data = new FormData();
  data.set("room", roomId);
  for (const [key, value] of Object.entries(extra)) data.set(key, value);
  return data;
};
async function demoAccess(roomId: string) {
  const response = await fetch(`/api/rooms/${roomId}/demo`, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw Error("unavailable");
  const data = await response.json();
  if (
    typeof data.token !== "string" ||
    typeof data.url !== "string" ||
    !data.url.startsWith("wss://")
  )
    throw Error("unavailable");
  return { url: data.url as string, token: data.token as string };
}
const canCrop = () =>
  typeof window !== "undefined" &&
  "CropTarget" in window &&
  !!navigator.mediaDevices?.getDisplayMedia;

/**
 * A link demo: the presenter's browser shows the site (inside Katsodi when
 * the site allows it, cropped to just the site), and streams it through
 * LiveKit. Everyone else watches; hosts accept requests, draw, suggest a
 * click, pause, resume and end the demo.
 */
export function DemoStage({
  roomId,
  demo,
  userId,
  canHost,
  hostIds,
  active,
  nameOf,
  onChanged,
}: {
  roomId: string;
  demo: RoomDemo | null;
  userId: string;
  canHost: boolean;
  /** Members allowed to draw; data from anyone else is ignored. */
  hostIds: string[];
  active: boolean;
  nameOf: (id: string) => string;
  onChanged: () => void;
}) {
  const { t } = useWorkspace();
  const n = t.network;
  const presenter = !!demo && demo.user_id === userId;
  const running = !!demo && demo.status !== "pending";
  const [mode, setMode] = useState<Mode>("checking");
  const [separateWindow, setSeparateWindow] = useState(false);
  const captureMode = separateWindow && mode === "in-app" ? "window" : mode;
  const [src, setSrc] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const prepareTabCapture = useRoomTabCapture(
    broadcasting && captureMode === "in-app",
  );
  const [watching, setWatching] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [problem, setProblem] = useState("");
  const [muted, setMuted] = useState(false);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [pointers, setPointers] = useState<Record<string, Pointer>>({});
  const [tool, setTool] = useState<AnnotationTool | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const fullscreen = useRoomFullscreen();
  const isFullscreen = fullscreen?.expanded || false;
  const [expandedDemo, setExpandedDemo] = useState(false);
  const openedRoomFullscreen = useRef(false);
  const showStageWithChat = useStageWithChat();
  const drawerTrigger = useRef<HTMLButtonElement>(null);
  const [result, setResult] = useState<ActionResult>(initialResult);
  const [aspect, setAspect] = useState(16 / 9);
  const [canPresent, setCanPresent] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- A browser capability known only on the client.
    setCanPresent(canPresentDemo());
  }, []);
  const frame = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const room = useRef<LiveKitRoom | null>(null);
  const publication = useRef<LocalTrackPublication | null>(null);
  const stream = useRef<MediaStream | null>(null);
  // Hosts and the presenter are trusted (clear all, snapshots); everyone
  // may annotate only while a host has opened annotations.
  const trusted = useRef<string[]>([]);
  trusted.current = demo ? [...hostIds, demo.user_id] : hostIds;
  const open = useRef(false);
  open.current = !!demo?.annotations_open;
  const marksRef = useRef<Mark[]>([]);
  marksRef.current = marks;
  const timers = useRef(new Map<string, number>());
  const presenterRef = useRef(false);
  presenterRef.current = presenter;
  const canAnnotate = canHost || presenter || !!demo?.annotations_open;
  // Apply one annotation message from `author` (a LiveKit identity).
  const receive = useCallback((signal: DemoSignal, author: string) => {
    const isTrusted = trusted.current.includes(author);
    if (!isTrusted && !open.current) return;
    if (signal.t === "pointer") {
      setPointers((all) => ({
        ...all,
        [author]: { x: signal.x, y: signal.y },
      }));
      window.clearTimeout(timers.current.get(`p:${author}`));
      timers.current.set(
        `p:${author}`,
        window.setTimeout(
          () =>
            setPointers((all) => {
              const next = { ...all };
              delete next[author];
              return next;
            }),
          2500,
        ),
      );
      return;
    }
    setMarks((current) => applyAnnotation(current, signal, author, isTrusted));
    // A click hint is a moment, not a lasting mark.
    if (signal.t === "hint")
      window.setTimeout(
        () => setMarks((current) => current.filter((m) => m.id !== signal.id)),
        8000,
      );
  }, []);

  const run = async (
    action: (p: ActionResult, f: FormData) => Promise<ActionResult>,
    extra?: Record<string, string>,
  ) => {
    const outcome = await action(initialResult, form(roomId, extra));
    setResult(outcome);
    if (outcome.status === "success") onChanged();
    return outcome;
  };

  const followVideoSize = useCallback((video: HTMLVideoElement) => {
    const update = () => {
      if (video.videoWidth && video.videoHeight)
        setAspect(video.videoWidth / video.videoHeight);
    };
    video.addEventListener("loadedmetadata", update);
    video.addEventListener("resize", update);
    update();
  }, []);

  // Everyone in a running demo: one LiveKit connection for video and marks.
  const connect = useCallback(async () => {
    if (room.current) return room.current;
    const access = await demoAccess(roomId);
    const { Room, RoomEvent, Track } = await import("livekit-client");
    const lk = new Room();
    lk.on(RoomEvent.DataReceived, (payload, participant) => {
      if (!participant) return;
      try {
        const parsed = demoSignal.safeParse(
          JSON.parse(new TextDecoder().decode(payload)),
        );
        if (parsed.success) receive(parsed.data, participant.identity);
      } catch {
        /* Ignore malformed data. */
      }
    });
    // Late joiners: the presenter sends the current annotations to them.
    lk.on(RoomEvent.ParticipantConnected, (participant) => {
      if (!presenterRef.current || !marksRef.current.length) return;
      void lk.localParticipant
        .publishData(
          new TextEncoder().encode(
            JSON.stringify({ t: "snapshot", marks: marksRef.current }),
          ),
          {
            reliable: true,
            topic: "demo",
            destinationIdentities: [participant.identity],
          },
        )
        .catch(() => {});
    });
    lk.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.source === Track.Source.ScreenShare) {
        const video = track.attach() as HTMLVideoElement;
        video.disablePictureInPicture = true;
        followVideoSize(video);
        screen.current?.querySelectorAll("video").forEach((v) => v.remove());
        screen.current?.prepend(video);
        setWatching(true);
      } else if (track.source === Track.Source.ScreenShareAudio) {
        const audio = track.attach();
        audio.hidden = true;
        screen.current?.append(audio);
        setMuted(!lk.canPlaybackAudio);
      }
    });
    lk.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((element) => element.remove());
      if (track.source === Track.Source.ScreenShare) setWatching(false);
    });
    lk.on(RoomEvent.AudioPlaybackStatusChanged, () =>
      setMuted(!lk.canPlaybackAudio),
    );
    await lk.connect(access.url, access.token);
    room.current = lk;
    return lk;
  }, [roomId, receive, followVideoSize]);

  const disconnect = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    publication.current = null;
    void room.current?.disconnect();
    room.current = null;
    screen.current?.replaceChildren();
    setBroadcasting(false);
    setWatching(false);
    setMuted(false);
  }, []);

  // Viewers connect while the stage is open; the presenter stays connected
  // whatever tab they look at, so the broadcast never stops by accident.
  const connected = running && (active || presenter);
  const rights =
    canHost || presenter ? "fixed" : String(!!demo?.annotations_open);
  useEffect(() => {
    if (!connected) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- A running demo starts a connection.
    setConnecting(true);
    connect()
      .catch(() => alive && setProblem("unavailable"))
      .finally(() => alive && setConnecting(false));
    return () => {
      alive = false;
      disconnect();
    };
  }, [connected, connect, disconnect, demo?.requested_at, rights]);

  // The presenter learns whether the site can open inside Katsodi.
  useEffect(() => {
    if (!presenter || !running) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- A new demo starts a new check.
    setMode("checking");
    fetch(`/api/rooms/${roomId}/demo`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const parsed = siteEmbeddingSchema.safeParse(data?.demo);
        const inApp = parsed.success && parsed.data.embedding === "allowed";
        if (inApp) setSrc(parsed.data.src);
        setMode(inApp && canCrop() ? "in-app" : "window");
      })
      .catch(() => {
        if (!controller.signal.aborted) setMode("window");
      });
    return () => controller.abort();
  }, [presenter, running, roomId, demo?.requested_at]);

  // The presenter confirms the demo; a refusal (ended by a host) stops it.
  useEffect(() => {
    if (!presenter || !running) return;
    const beat = () =>
      void beatDemo(initialResult, form(roomId)).then((outcome) => {
        if (outcome.status !== "success") disconnect();
      });
    beat();
    const timer = window.setInterval(beat, 20000);
    return () => window.clearInterval(timer);
  }, [presenter, running, roomId, disconnect]);

  // A host's pause stops sending frames; resuming sends them again.
  useEffect(() => {
    const track = publication.current?.track;
    if (!track) return;
    if (demo?.status === "paused") void track.mute();
    else void track.unmute();
  }, [demo?.status, broadcasting]);

  async function startBroadcast() {
    setProblem("");
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setProblem("unsupported");
      return;
    }
    let capture: MediaStream | null = null;
    try {
      if (captureMode === "in-app") await prepareTabCapture?.();
      if (captureMode === "window")
        window.open(demo!.url, "_blank", "noopener");
      capture = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: captureMode === "in-app" ? "browser" : "window",
        },
        // In-app capture would also carry this tab's voice call: no audio.
        audio: captureMode === "window",
        ...(captureMode === "in-app"
          ? { preferCurrentTab: true, selfBrowserSurface: "include" }
          : { selfBrowserSurface: "exclude" }),
      } as DisplayMediaStreamOptions);
    } catch {
      setProblem("denied");
      return;
    }
    try {
      const video = capture.getVideoTracks()[0] as CropCapable;
      if (captureMode === "in-app") {
        if (!frame.current || typeof video.cropTo !== "function")
          throw Error("unavailable");
        const api = (window as unknown as { CropTarget: CropTargetApi })
          .CropTarget;
        await video.cropTo(await api.fromElement(frame.current));
      }
      const lk = await connect();
      const { Track } = await import("livekit-client");
      publication.current = await lk.localParticipant.publishTrack(video, {
        source: Track.Source.ScreenShare,
        name: "demo",
      });
      const audio = capture.getAudioTracks()[0];
      if (audio)
        await lk.localParticipant.publishTrack(audio, {
          source: Track.Source.ScreenShareAudio,
          name: "demo-audio",
        });
      stream.current = capture;
      // The browser's own "Stop sharing" ends the demo too.
      video.addEventListener("ended", () => void end());
      if (captureMode === "window") {
        const settings = video.getSettings();
        if (settings.width && settings.height)
          setAspect(settings.width / settings.height);
        const preview = document.createElement("video");
        preview.muted = true;
        preview.autoplay = true;
        preview.playsInline = true;
        preview.srcObject = new MediaStream([video]);
        followVideoSize(preview);
        screen.current?.replaceChildren(preview);
      }
      setBroadcasting(true);
      if (demo?.status === "paused") void publication.current.track?.mute();
    } catch {
      capture.getTracks().forEach((track) => track.stop());
      setProblem("unavailable");
    }
  }

  async function end() {
    disconnect();
    await run(stopDemo);
  }

  const send = (signal: DemoSignal) => {
    receive(signal, userId);
    void room.current?.localParticipant
      .publishData(new TextEncoder().encode(JSON.stringify(signal)), {
        // The live pointer may drop frames; marks must arrive.
        reliable: signal.t !== "pointer",
        topic: "demo",
      })
      .catch(() => {});
  };
  const undo = () => {
    const mine = marks.filter((m) => m.author === userId);
    const last = mine[mine.length - 1];
    if (last) send({ t: "erase", ids: [last.id] });
  };

  const problemText =
    problem === "unsupported"
      ? n.demoUnsupported
      : problem === "denied"
        ? n.demoDenied
        : problem === "unavailable"
          ? n.demoUnavailable
          : "";
  const sharer = demo ? nameOf(demo.user_id) : "";
  const overlay = (
    <DemoOverlay
      marks={marks}
      pointers={pointers}
      tool={canAnnotate ? tool : null}
      userId={userId}
      nameOf={nameOf}
      onSend={send}
      labels={{
        textPlaceholder: n.annotateTextPlaceholder,
        annotators: n.annotators,
        hint: n.demoHintLabel,
      }}
    />
  );
  const toolButton = (
    value: AnnotationTool,
    label: string,
    icon: React.ReactNode,
  ) => (
    <button
      key={value}
      type="button"
      aria-pressed={tool === value}
      aria-label={label}
      title={label}
      onClick={() => {
        setTool(tool === value ? null : value);
        if (isFullscreen) {
          drawerTrigger.current?.focus();
          setToolsOpen(false);
        }
      }}
    >
      {icon}
    </button>
  );
  const stampLabels = {
    check: n.stampCheck,
    cross: n.stampCross,
    star: n.stampStar,
    question: n.stampQuestion,
  };
  const stampGlyphs = { check: "✓", cross: "✕", star: "★", question: "?" };

  // No demo yet.
  if (!demo)
    return (
      <section className="room-player room-demo" aria-label={n.demoTitle}>
        <header>
          <span>
            <MonitorPlay size={17} />
            {n.demoTitle}
          </span>
        </header>
        <div className="player-state" role="status">
          <MonitorPlay size={38} />
          <h2>{n.demoTitle}</h2>
          <p>{n.demoIdle}</p>
          {!canPresent && (
            <p className="notice demo-phone-notice" role="note">
              {n.demoPhone}
            </p>
          )}
        </div>
        <footer>
          <p>{n.demoNote}</p>
          <p className="demo-rights-warning" role="note">
            {n.demoRightsWarning}
          </p>
        </footer>
      </section>
    );

  return (
    <section
      className={`room-player room-demo ${expandedDemo && running ? "is-expanded" : ""}`}
      aria-label={n.demoTitle}
    >
      <header>
        <span>
          <MonitorPlay size={17} />
          {n.demoTitle}
        </span>
        <div className="demo-header-actions">
          <span className="pill" title={demo.url}>
            {presenter
              ? `${n.demoYouShare} · ${new URL(demo.url).hostname}`
              : `${sharer} · ${running ? n.demoViewOnly : n.demoWaitingLabel}`}
          </span>
          {running && fullscreen && (
            <button
              type="button"
              className="demo-expand-chat"
              aria-label={
                expandedDemo
                  ? t.roomStudio.restoreWithChat
                  : t.roomStudio.expandWithChat
              }
              title={t.roomStudio.expandWithChatHint}
              aria-pressed={expandedDemo}
              onClick={() => {
                setExpandedDemo(!expandedDemo);
                if (!expandedDemo) {
                  showStageWithChat?.();
                  openedRoomFullscreen.current = !isFullscreen;
                  if (!isFullscreen) void fullscreen.toggleExpanded();
                } else if (openedRoomFullscreen.current && isFullscreen) {
                  openedRoomFullscreen.current = false;
                  void fullscreen.toggleExpanded();
                }
              }}
            >
              {expandedDemo ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              <span>
                {expandedDemo
                  ? t.roomStudio.restoreWithChat
                  : t.roomStudio.expandWithChat}
              </span>
            </button>
          )}
        </div>
      </header>

      {demo.status === "pending" ? (
        <div className="player-state" role="status">
          <MonitorPlay size={38} />
          <h2>
            {presenter
              ? n.demoPendingMine
              : `${sharer} ${canHost ? n.demoPendingHost : n.demoPendingOther}`}
          </h2>
          <p className="demo-url">{demo.url}</p>
          {canHost && !presenter && (
            <div className="demo-decide">
              <button
                type="button"
                className="button button-primary"
                onClick={() => void run(decideDemo, { accept: "1" })}
              >
                {n.demoAccept}
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => void run(decideDemo, { accept: "0" })}
              >
                {n.demoDecline}
              </button>
            </div>
          )}
          {presenter && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => void run(stopDemo)}
            >
              {n.demoWithdraw}
            </button>
          )}
        </div>
      ) : (
        <div className="demo-canvas">
          {presenter && captureMode === "in-app" ? (
            <div className="demo-frame" ref={frame}>
              <ExternalMedia provider={hostLabel(src)}>
                <iframe
                  src={src}
                  title={n.demoFrame}
                  allow="fullscreen; clipboard-write"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
                />
              </ExternalMedia>
              {overlay}
            </div>
          ) : (
            <div
              className="demo-screen"
              style={
                {
                  aspectRatio: String(aspect),
                  "--demo-aspect": aspect,
                } as CSSProperties
              }
              hidden={!(watching || (presenter && broadcasting))}
            >
              <div className="demo-video" ref={screen} />
              {overlay}
            </div>
          )}
          {demo.status === "paused" && (
            <p className="demo-paused" role="status">
              <CirclePause size={18} />
              {n.demoPausedBy} {nameOf(demo.paused_by ?? "")}
            </p>
          )}
          {!(
            watching ||
            (presenter && broadcasting) ||
            (presenter && captureMode === "in-app")
          ) && (
            <div className="player-state" role="status">
              <MonitorPlay size={38} />
              <h2>
                {presenter
                  ? captureMode === "window"
                    ? n.demoWindowTitle
                    : n.demoConnecting
                  : connecting
                    ? n.demoConnecting
                    : n.demoWaitingStream}
              </h2>
              {presenter && captureMode === "window" && (
                <p>{n.demoWindowHint}</p>
              )}
            </div>
          )}
        </div>
      )}

      <footer>
        {running && presenter && mode === "in-app" && !broadcasting && (
          <button
            type="button"
            className="text-link"
            title={n.demoCaptureChoiceHint}
            onClick={() => setSeparateWindow((value) => !value)}
          >
            {separateWindow ? n.demoUseInApp : n.demoUseWindow}
          </button>
        )}
        {problemText && (
          <p className="demo-problem" role="alert">
            {problemText}
          </p>
        )}
        {running &&
          presenter &&
          !broadcasting &&
          captureMode !== "checking" && (
            <div>
              <button
                type="button"
                className="button button-primary"
                onClick={() => void startBroadcast()}
              >
                {captureMode === "window" ? (
                  <ExternalLink size={17} />
                ) : (
                  <MonitorPlay size={17} />
                )}
                {captureMode === "window"
                  ? n.demoOpenAndShare
                  : n.demoStartInApp}
              </button>
            </div>
          )}
        {running && presenter && captureMode === "in-app" && !broadcasting && (
          <p>{n.demoInAppHint}</p>
        )}
        <div className="demo-tool-drawer" data-open={toolsOpen}>
          {running && canAnnotate && (
            <button
              type="button"
              className="demo-tool-toggle"
              ref={drawerTrigger}
              aria-label={
                toolsOpen ? t.roomStudio.hideTools : t.roomStudio.showTools
              }
              aria-expanded={toolsOpen}
              onClick={() => setToolsOpen(!toolsOpen)}
            >
              <SlidersHorizontal size={20} />
              {toolsOpen ? (
                <ChevronLeft size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          )}
          <div
            className="demo-tool-drawer-content"
            inert={isFullscreen && !toolsOpen ? true : undefined}
          >
            <p className="demo-tool-drawer-heading">{t.roomStudio.tools}</p>
            {running && canAnnotate && (
              <div
                className="demo-tools demo-annotate"
                role="toolbar"
                aria-label={n.annotateTools}
              >
                {toolButton("pen", n.toolPen, <Pencil size={16} />)}
                {toolButton(
                  "highlighter",
                  n.toolHighlighter,
                  <Highlighter size={16} />,
                )}
                {toolButton("arrow", n.toolArrow, <MoveUpRight size={16} />)}
                {toolButton(
                  "box",
                  n.toolBox,
                  <RectangleHorizontal size={16} />,
                )}
                {toolButton("text", n.toolText, <Type size={16} />)}
                {stampKinds.map((kind) =>
                  toolButton(
                    `stamp:${kind}`,
                    stampLabels[kind],
                    <span className="demo-stamp-glyph">
                      {stampGlyphs[kind]}
                    </span>,
                  ),
                )}
                {toolButton(
                  "pointer",
                  n.toolPointer,
                  <PointerIcon size={16} />,
                )}
                {toolButton(
                  "hint",
                  n.demoHint,
                  <MousePointerClick size={16} />,
                )}
                {toolButton("eraser", n.toolEraser, <Eraser size={16} />)}
                <button
                  type="button"
                  aria-label={n.annotateUndo}
                  title={n.annotateUndo}
                  onClick={undo}
                >
                  <Undo2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => send({ t: "clear", scope: "mine" })}
                >
                  <Trash2 size={16} />
                  {n.annotateClearMine}
                </button>
              </div>
            )}
            {running && (canHost || presenter) && (
              <div
                className="demo-tools"
                role="toolbar"
                aria-label={n.demoTools}
              >
                {canHost && (
                  <>
                    <button
                      type="button"
                      onClick={() => send({ t: "clear", scope: "all" })}
                    >
                      <Trash2 size={16} />
                      {n.annotateClearAll}
                    </button>
                    <button
                      type="button"
                      aria-pressed={!!demo.annotations_open}
                      onClick={() =>
                        void run(setDemoAnnotations, {
                          open: demo.annotations_open ? "0" : "1",
                        })
                      }
                    >
                      <Users size={16} />
                      {n.annotateAllowAll}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void run(pauseDemo, {
                          paused: demo.status === "paused" ? "0" : "1",
                        })
                      }
                    >
                      {demo.status === "paused" ? (
                        <CirclePlay size={16} />
                      ) : (
                        <CirclePause size={16} />
                      )}
                      {demo.status === "paused" ? n.demoResume : n.demoPause}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="demo-end"
                  onClick={() => void end()}
                >
                  <Square size={16} />
                  {n.demoEnd}
                </button>
              </div>
            )}
          </div>
        </div>
        {running && !canAnnotate && <p>{n.annotateClosed}</p>}
        {running && canAnnotate && !canHost && !presenter && (
          <p>{n.annotateOpenNote}</p>
        )}
        {watching && muted && (
          <div>
            <button
              type="button"
              className="text-link"
              onClick={() => void room.current?.startAudio().catch(() => {})}
            >
              <Volume2 size={15} />
              {n.demoSound}
            </button>
          </div>
        )}
        <ActionStatus
          result={result.status === "error" ? result : initialResult}
        />
        <small
          title={`${presenter && captureMode === "in-app" ? n.demoNoSound : n.demoNote} ${n.demoDrm}`}
        >
          {presenter && captureMode === "in-app" ? n.demoNoSound : n.demoNote}{" "}
          {n.demoDrm}
        </small>
        <p
          className="demo-rights-warning"
          role="note"
          title={n.demoRightsWarning}
          tabIndex={0}
        >
          {n.demoRightsWarning}
        </p>
      </footer>
    </section>
  );
}
