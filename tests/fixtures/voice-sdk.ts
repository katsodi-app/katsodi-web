// Isolated browser fixture, never imported by application routes.
export const RoomEvent = {
  ParticipantConnected: "joined",
  ParticipantDisconnected: "left",
  ActiveSpeakersChanged: "speakers",
  TrackMuted: "muted",
  TrackUnmuted: "unmuted",
  LocalTrackPublished: "published",
  LocalTrackUnpublished: "unpublished",
  TrackSubscribed: "subscribed",
  TrackUnsubscribed: "unsubscribed",
  AudioPlaybackStatusChanged: "playback",
  Reconnecting: "reconnecting",
  Reconnected: "reconnected",
  Disconnected: "disconnected",
  DataReceived: "data",
};
export const Track = {
  Kind: { Audio: "audio", Video: "video" },
  Source: {
    Microphone: "microphone",
    ScreenShare: "screen_share",
    ScreenShareAudio: "screen_share_audio",
  },
};
type ScreenFixture = {
  __screenDeny?: boolean;
  __screenViewer?: boolean;
  __screenShares?: number;
  __published?: string[];
  __demoData?: unknown[];
  __muted?: boolean;
};
const fakeVideo = (label: string) => {
  const video = document.createElement("video");
  video.dataset.fakeScreen = label;
  return video;
};
export class Room {
  private listeners = new Map<string, ((...args: unknown[]) => void)[]>();
  localParticipant = {
    identity: "10000000-0000-4000-8000-000000000001",
    isSpeaking: false,
    isMicrophoneEnabled: false,
    setMicrophoneEnabled: async (value: boolean) => {
      this.localParticipant.isMicrophoneEnabled = value;
      this.emit(RoomEvent.TrackUnmuted);
    },
    // Screen sharing: the browser picker is simulated; __screenDeny cancels it.
    setScreenShareEnabled: async (value: boolean) => {
      const state = window as unknown as ScreenFixture;
      if (!value) {
        this.emit(RoomEvent.LocalTrackUnpublished, { source: "screen_share" });
        return undefined;
      }
      if (state.__screenDeny) throw Error("NotAllowedError");
      state.__screenShares = (state.__screenShares || 0) + 1;
      return {
        source: "screen_share",
        track: { source: "screen_share", attach: () => fakeVideo("local") },
      };
    },
    // Link demos publish their own captured track and send host marks.
    publishTrack: async (_track: unknown, options: { source: string }) => {
      const state = window as unknown as ScreenFixture;
      state.__published = [...(state.__published || []), options.source];
      return {
        source: options.source,
        track: {
          mute: async () => {
            state.__muted = true;
          },
          unmute: async () => {
            state.__muted = false;
          },
        },
      };
    },
    publishData: async (
      payload: Uint8Array,
      options?: { destinationIdentities?: string[] },
    ) => {
      const state = window as unknown as ScreenFixture & {
        __demoTo?: (string[] | null)[];
      };
      state.__demoData = [
        ...(state.__demoData || []),
        JSON.parse(new TextDecoder().decode(payload)),
      ];
      state.__demoTo = [
        ...(state.__demoTo || []),
        options?.destinationIdentities ?? null,
      ];
    },
  };
  remoteParticipants = new Map([
    [
      "friend",
      {
        identity: "10000000-0000-4000-8000-000000000002",
        isSpeaking: false,
        isMicrophoneEnabled: true,
        setVolume: (value: number) => {
          (window as unknown as { __voiceVolumes: number[] }).__voiceVolumes = [
            ...((window as unknown as { __voiceVolumes?: number[] })
              .__voiceVolumes || []),
            value,
          ];
        },
      },
    ],
  ]);
  canPlaybackAudio = true;
  private speaking = () => {
    this.remoteParticipants.get("friend")!.isSpeaking = true;
    this.emit(RoomEvent.ActiveSpeakersChanged);
  };
  on(event: string, callback: (...args: unknown[]) => void) {
    this.listeners.set(event, [...(this.listeners.get(event) || []), callback]);
    return this;
  }
  private emit(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((fn) => fn(...args));
  }
  // Test hooks: an unexplained network drop, or a server-side removal.
  private drop = () => this.emit(RoomEvent.Disconnected, undefined);
  private kick = () => this.emit(RoomEvent.Disconnected, 4);
  // Test hook: someone joins the demo room.
  private join = (event: Event) =>
    this.emit(RoomEvent.ParticipantConnected, {
      identity: (event as CustomEvent).detail,
    });
  // Test hook: a participant sends a demo mark over the data channel.
  private data = (event: Event) => {
    const { identity, signal } = (event as CustomEvent).detail;
    this.emit(
      RoomEvent.DataReceived,
      new TextEncoder().encode(JSON.stringify(signal)),
      { identity },
    );
  };
  async connect() {
    const state = window as unknown as { __voiceConnects?: number };
    state.__voiceConnects = (state.__voiceConnects || 0) + 1;
    window.addEventListener("voice-fixture-speaking", this.speaking);
    window.addEventListener("voice-fixture-drop", this.drop);
    window.addEventListener("voice-fixture-kick", this.kick);
    window.addEventListener("demo-fixture-data", this.data);
    window.addEventListener("demo-fixture-join", this.join);
    const element = document.createElement("audio");
    this.emit(RoomEvent.TrackSubscribed, {
      kind: "audio",
      attach: () => element,
      detach: () => [element],
    });
    // A viewer of a screen share receives the sharer's video track.
    if ((window as unknown as ScreenFixture).__screenViewer) {
      const video = fakeVideo("remote");
      this.emit(RoomEvent.TrackSubscribed, {
        kind: "video",
        source: "screen_share",
        attach: () => video,
        detach: () => [video],
      });
    }
  }
  async disconnect() {
    window.removeEventListener("voice-fixture-speaking", this.speaking);
    window.removeEventListener("voice-fixture-drop", this.drop);
    window.removeEventListener("voice-fixture-kick", this.kick);
    window.removeEventListener("demo-fixture-data", this.data);
    window.removeEventListener("demo-fixture-join", this.join);
    this.localParticipant.isMicrophoneEnabled = false;
    this.emit(RoomEvent.Disconnected);
  }
  async startAudio() {
    this.canPlaybackAudio = true;
  }
  async switchActiveDevice(kind: string, device: string) {
    if (!["audioinput", "audiooutput"].includes(kind) || !device)
      throw Error("invalid_device");
    (window as unknown as { __voiceOutput?: string }).__voiceOutput =
      kind === "audiooutput" ? device : undefined;
    return true;
  }
}
