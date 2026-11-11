"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Room, Participant, RemoteAudioTrack } from "livekit-client";
import {
  AudioLines,
  Headphones,
  HeadphoneOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Settings2,
  Volume2,
  Radio,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { authorColor } from "@/lib/annotations";
import type { CSSProperties } from "react";
import { UserAvatar } from "./user-avatar";
import { MicrophoneCheck } from "./microphone-check";
type Person = { id: string; name: string; speaking: boolean; muted: boolean };
/** Only an unexplained drop (network) is retried; never a kick or a leave. */
const RETRY_DELAYS = [2000, 5000, 10000];
const UNKNOWN_REASON = 0;
const outputSelectable = () =>
  typeof HTMLMediaElement !== "undefined" &&
  "setSinkId" in HTMLMediaElement.prototype;
export function VoiceLounge({
  roomId,
  profiles,
}: {
  roomId: string;
  profiles: {
    id: string;
    display_name: string;
    avatar_path?: string | null;
    media_updated_at?: string | null;
  }[];
}) {
  const { t } = useWorkspace(),
    v = t.voice;
  const inputId = useId();
  const [ready, setReady] = useState(false),
    [checking, setChecking] = useState(true),
    [joining, setJoining] = useState(false),
    [connected, setConnected] = useState(false),
    [reconnecting, setReconnecting] = useState(false);
  const [people, setPeople] = useState<Person[]>([]),
    [mic, setMic] = useState(false),
    [deaf, setDeaf] = useState(false),
    [error, setError] = useState(""),
    [audioBlocked, setAudioBlocked] = useState(false),
    [devices, setDevices] = useState<MediaDeviceInfo[]>([]),
    [settings, setSettings] = useState(false),
    [device, setDevice] = useState(""),
    [outputs, setOutputs] = useState<MediaDeviceInfo[]>([]),
    [output, setOutput] = useState(""),
    [volumes, setVolumes] = useState<Record<string, number>>({}),
    [selfId, setSelfId] = useState("");
  const room = useRef<Room | null>(null),
    audio = useRef<HTMLDivElement>(null),
    generation = useRef(0),
    deafRef = useRef(false),
    restoreMic = useRef(false),
    names = useRef(profiles),
    retries = useRef(0),
    retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    volumesRef = useRef<Record<string, number>>({});
  useEffect(() => {
    names.current = profiles;
  }, [profiles]);
  const leave = useCallback(() => {
    generation.current++;
    clearTimeout(retryTimer.current);
    retries.current = 0;
    const current = room.current;
    room.current = null;
    void current?.disconnect(true);
    audio.current?.replaceChildren();
    setConnected(false);
    setJoining(false);
    setReconnecting(false);
    setPeople([]);
    setMic(false);
    setDeaf(false);
    setAudioBlocked(false);
    deafRef.current = false;
  }, []);
  const disconnect = useCallback(() => {
    generation.current++;
    void room.current?.disconnect(true);
    room.current = null;
  }, []);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const check = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}/voice`, {
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(8000),
          ]),
        });
        if (!alive) return;
        setReady(response.ok);
        setChecking(false);
        if (!response.ok && room.current) {
          leave();
          setError(
            response.status === 401 || response.status === 403
              ? "access"
              : "unavailable",
          );
        }
      } catch {
        if (alive) {
          setReady(false);
          setChecking(false);
          if (room.current) {
            leave();
            setError("network");
          }
        }
      }
    };
    void check();
    const timer = setInterval(check, 10000);
    return () => {
      alive = false;
      controller.abort();
      clearInterval(timer);
      disconnect();
    };
  }, [roomId, leave, disconnect]);
  /** Lists microphones and speakers (labels appear after permission). */
  async function refreshDevices() {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((d) => d.kind === "audioinput"));
      setOutputs(list.filter((d) => d.kind === "audiooutput"));
    } catch {
      /* Device listing is optional. */
    }
  }
  /** Sets one participant's playback volume (0–1), kept across reconnects. */
  function changeVolume(identity: string, value: number) {
    volumesRef.current = { ...volumesRef.current, [identity]: value };
    setVolumes(volumesRef.current);
    const participant = [
      ...(room.current?.remoteParticipants.values() || []),
    ].find((p) => p.identity === identity);
    participant?.setVolume(value);
  }
  async function join(retrying = false) {
    clearTimeout(retryTimer.current);
    const attempt = ++generation.current;
    if (retrying) setReconnecting(true);
    else {
      retries.current = 0;
      setJoining(true);
    }
    setError("");
    try {
      const response = await fetch(`/api/rooms/${roomId}/voice`, {
        method: "POST",
        signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (!response.ok)
        throw Error(
          response.status === 401 || response.status === 403
            ? "access"
            : "unavailable",
        );
      const data = await response.json();
      if (
        typeof data.token !== "string" ||
        typeof data.url !== "string" ||
        !data.url.startsWith("wss://")
      )
        throw Error("network");
      const { Room, RoomEvent, Track } = await import("livekit-client");
      if (attempt !== generation.current) return;
      const call = new Room({
        adaptiveStream: true,
        audioCaptureDefaults: {
          deviceId: device ? { exact: device } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      room.current = call;
      const update = () => {
        if (attempt !== generation.current) return;
        const all: Participant[] = [
          call.localParticipant,
          ...call.remoteParticipants.values(),
        ];
        setPeople(
          all.map((p) => ({
            id: p.identity,
            name:
              names.current.find((n) => n.id === p.identity)?.display_name ||
              v.member,
            speaking: p.isSpeaking,
            muted: !p.isMicrophoneEnabled,
          })),
        );
        setMic(call.localParticipant.isMicrophoneEnabled);
      };
      // Re-apply chosen volumes when someone (re)joins or after a rejoin.
      const applyVolumes = () => {
        for (const participant of call.remoteParticipants.values()) {
          const value = volumesRef.current[participant.identity];
          if (value !== undefined) participant.setVolume(value);
        }
      };
      call.on(RoomEvent.ParticipantConnected, applyVolumes);
      call
        .on(RoomEvent.ParticipantConnected, update)
        .on(RoomEvent.ParticipantDisconnected, update)
        .on(RoomEvent.ActiveSpeakersChanged, update)
        .on(RoomEvent.TrackMuted, update)
        .on(RoomEvent.TrackUnmuted, update)
        .on(RoomEvent.LocalTrackPublished, update)
        .on(RoomEvent.LocalTrackUnpublished, update);
      call.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const element = (track as RemoteAudioTrack).attach();
          element.muted = deafRef.current;
          audio.current?.append(element);
        }
      });
      call.on(RoomEvent.TrackUnsubscribed, (track) =>
        track.detach().forEach((el) => el.remove()),
      );
      call.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        if (attempt === generation.current)
          setAudioBlocked(!call.canPlaybackAudio);
      });
      call.on(RoomEvent.Reconnecting, () => {
        if (attempt === generation.current) setReconnecting(true);
      });
      call.on(RoomEvent.Reconnected, () => {
        if (attempt === generation.current) {
          setReconnecting(false);
          update();
        }
      });
      call.on(RoomEvent.Disconnected, (reason?: number) => {
        if (attempt !== generation.current) return;
        // A network drop that LiveKit could not resume: rejoin with a fresh
        // token (membership is re-checked) and the microphone off.
        if (
          (reason === undefined || reason === UNKNOWN_REASON) &&
          retries.current < RETRY_DELAYS.length
        ) {
          const delay = RETRY_DELAYS[retries.current++];
          generation.current++;
          room.current = null;
          audio.current?.replaceChildren();
          setConnected(false);
          setMic(false);
          setReconnecting(true);
          retryTimer.current = setTimeout(() => void join(true), delay);
          return;
        }
        leave();
        setError(
          reason === undefined || reason === UNKNOWN_REASON
            ? "network"
            : "disconnected",
        );
      });
      await call.connect(data.url, data.token);
      if (attempt !== generation.current) {
        await call.disconnect(true);
        return;
      }
      setSelfId(call.localParticipant.identity);
      setConnected(true);
      setJoining(false);
      setReconnecting(false);
      retries.current = 0;
      applyVolumes();
      if (output)
        await call.switchActiveDevice("audiooutput", output).catch(() => false);
      update();
      setAudioBlocked(!call.canPlaybackAudio);
    } catch (err) {
      if (attempt !== generation.current) return;
      // A failed rejoin tries again until the retries run out; a refused
      // token (access revoked) stops immediately.
      if (
        retrying &&
        !(err instanceof Error && err.message === "access") &&
        retries.current < RETRY_DELAYS.length
      ) {
        const delay = RETRY_DELAYS[retries.current++];
        retryTimer.current = setTimeout(() => void join(true), delay);
        return;
      }
      leave();
      setError(
        err instanceof Error && ["access", "unavailable"].includes(err.message)
          ? err.message
          : "network",
      );
    }
  }
  async function toggleMic() {
    const current = room.current;
    if (!current || deaf) return;
    try {
      await current.localParticipant.setMicrophoneEnabled(
        !current.localParticipant.isMicrophoneEnabled,
      );
      if (room.current !== current) {
        await current.localParticipant.setMicrophoneEnabled(false);
        return;
      }
      setMic(current.localParticipant.isMicrophoneEnabled);
      setError("");
      await refreshDevices();
    } catch {
      setError("microphone");
    }
  }
  async function toggleDeaf() {
    const current = room.current;
    if (!current) return;
    const next = !deafRef.current;
    try {
      if (next) {
        restoreMic.current = current.localParticipant.isMicrophoneEnabled;
        await current.localParticipant.setMicrophoneEnabled(false);
      } else if (restoreMic.current)
        await current.localParticipant.setMicrophoneEnabled(true);
      if (room.current !== current) {
        await current.localParticipant.setMicrophoneEnabled(false);
        return;
      }
      deafRef.current = next;
      setDeaf(next);
      setMic(current.localParticipant.isMicrophoneEnabled);
      audio.current?.querySelectorAll("audio").forEach((el) => {
        el.muted = next;
      });
    } catch {
      setError("microphone");
    }
  }
  const shown = connected
    ? people
    : profiles.slice(0, 6).map((p) => ({
        id: p.id,
        name: p.display_name,
        speaking: false,
        muted: true,
      }));
  return (
    <section
      className={`voice-lounge ${connected ? "is-connected" : ""}`}
      aria-label={v.title}
    >
      <header className="voice-header">
        <div>
          <span className="voice-symbol">
            <Headphones size={19} />
          </span>
          <div>
            <span className="eyebrow">KATSODI LOUNGE</span>
            <h2>{v.title}</h2>
          </div>
        </div>
        <span className={`voice-state ${connected ? "on" : ""}`} role="status">
          <span />
          {checking
            ? v.checking
            : reconnecting
              ? v.reconnecting
              : connected
                ? v.connected
                : ready
                  ? v.ready
                  : v.offline}
        </span>
      </header>
      <div className="voice-stage">
        <div className="voice-orbit" aria-hidden="true" />
        <p className="voice-stage-caption">
          {connected ? `${v.inCall} · ${people.length}` : v.gather}
        </p>
        <div className="voice-people">
          {shown.length ? (
            shown.map((person) => (
              <div
                className={`voice-person ${person.speaking ? "is-speaking" : ""} ${connected && person.muted ? "is-muted" : ""}`}
                key={person.id}
                style={{ "--author": authorColor(person.id) } as CSSProperties}
              >
                <span className="voice-avatar">
                  <UserAvatar
                    userId={person.id}
                    name={person.name}
                    available={
                      !!profiles.find((p) => p.id === person.id)?.avatar_path
                    }
                    version={
                      profiles.find((p) => p.id === person.id)?.media_updated_at
                    }
                  />
                  {connected && (
                    <i>
                      {person.muted ? (
                        <MicOff size={12} />
                      ) : (
                        <AudioLines size={12} />
                      )}
                    </i>
                  )}
                </span>
                <strong>{person.name}</strong>
                <small>
                  {connected
                    ? person.speaking
                      ? v.speaking
                      : person.muted
                        ? v.muted
                        : v.listening
                    : v.roomMember}
                </small>
              </div>
            ))
          ) : (
            <div className="voice-empty">
              <Radio size={32} />
              <p>{v.gather}</p>
            </div>
          )}
        </div>
        <p className="voice-hint">
          {connected ? v.listenFirst : ready ? v.invite : v.setup}
        </p>
      </div>
      {error && (
        <p className="voice-error" role="alert">
          {v[error as keyof typeof v] || v.network}
        </p>
      )}
      {audioBlocked && connected && (
        <button
          className="text-link voice-resume"
          onClick={() =>
            void room.current?.startAudio().catch(() => setError("network"))
          }
        >
          <Volume2 size={16} />
          {v.resume}
        </button>
      )}
      <div className="voice-controls">
        <div className="voice-control-group">
          <button
            type="button"
            className={!mic ? "is-muted" : ""}
            disabled={!connected || deaf || reconnecting}
            aria-label={mic ? v.mute : v.unmute}
            aria-pressed={mic}
            onClick={() => void toggleMic()}
          >
            {mic ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button
            type="button"
            disabled={!connected}
            aria-label={deaf ? v.undeafen : v.deafen}
            aria-pressed={deaf}
            onClick={() => void toggleDeaf()}
          >
            {deaf ? <HeadphoneOff size={20} /> : <Headphones size={20} />}
          </button>
          <button
            type="button"
            disabled={!connected}
            aria-label={v.settings}
            aria-expanded={settings}
            onClick={() => {
              if (!settings) void refreshDevices();
              setSettings(!settings);
            }}
          >
            <Settings2 size={19} />
          </button>
        </div>
        {connected || joining ? (
          <button
            type="button"
            className="voice-hangup"
            onClick={leave}
            aria-label={v.leave}
          >
            <PhoneOff size={20} />
            <span>{joining ? v.cancel : v.leave}</span>
          </button>
        ) : (
          <button
            type="button"
            className="voice-join"
            disabled={!ready || checking}
            onClick={() => void join()}
          >
            <Phone size={19} />
            <span>{v.join}</span>
          </button>
        )}
      </div>
      {settings && connected && (
        <div className="voice-settings">
          <label htmlFor={inputId}>{v.input}</label>
          <select
            id={inputId}
            value={device}
            onChange={async (e) => {
              const selected = e.target.value;
              try {
                if (
                  await room.current?.switchActiveDevice(
                    "audioinput",
                    selected || "default",
                  )
                ) {
                  setDevice(selected);
                  setError("");
                }
              } catch {
                setError("microphone");
              }
            }}
          >
            <option value="">{v.defaultDevice}</option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || v.input}
              </option>
            ))}
          </select>
          <p>{v.deviceHint}</p>
          {outputSelectable() ? (
            <>
              <label htmlFor={`${inputId}-output`}>{v.output}</label>
              <select
                id={`${inputId}-output`}
                value={output}
                onChange={async (e) => {
                  const selected = e.target.value;
                  try {
                    if (
                      await room.current?.switchActiveDevice(
                        "audiooutput",
                        selected || "default",
                      )
                    )
                      setOutput(selected);
                  } catch {
                    setError("network");
                  }
                }}
              >
                <option value="">{v.defaultDevice}</option>
                {outputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || v.output}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <p>{v.outputUnsupported}</p>
          )}
          {people.some((person) => person.id !== selfId) && (
            <fieldset className="voice-volumes">
              <legend>{v.volumes}</legend>
              {people
                .filter((person) => person.id !== selfId)
                .map((person) => (
                  <label key={person.id} className="voice-volume">
                    <span>{person.name}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={Math.round((volumes[person.id] ?? 1) * 100)}
                      aria-label={`${v.volumeFor} ${person.name}`}
                      onChange={(e) =>
                        changeVolume(person.id, Number(e.target.value) / 100)
                      }
                    />
                    <output>
                      {Math.round((volumes[person.id] ?? 1) * 100)}%
                    </output>
                  </label>
                ))}
            </fieldset>
          )}
        </div>
      )}
      {!connected && !joining && (
        <MicrophoneCheck device={device} onDevice={setDevice} />
      )}
      <footer className="voice-footer">
        <span>
          <MicOff size={12} />
          {v.optIn}
        </span>
        <span>{v.noRecording}</span>
      </footer>
      <div ref={audio} className="voice-audio" />
    </section>
  );
}
