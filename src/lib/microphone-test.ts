export type MicrophoneError =
  "denied" | "missing" | "busy" | "device" | "unsupported" | "failed";
export type MicrophoneState = {
  status: "idle" | "requesting" | "active" | "failed";
  level: number;
  error?: MicrophoneError;
};
export function microphoneError(error: unknown): MicrophoneError {
  const name =
    error && typeof error === "object" && "name" in error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError") return "missing";
  if (name === "NotReadableError" || name === "AbortError") return "busy";
  if (name === "OverconstrainedError") return "device";
  return "failed";
}
/** Local analysis only: no destination, recorder, network or playback. */
export class MicrophoneTest {
  private epoch = 0;
  private stream?: MediaStream;
  private context?: AudioContext;
  private timer?: ReturnType<typeof setInterval>;
  private timeout?: ReturnType<typeof setTimeout>;
  constructor(
    private changed: (state: MicrophoneState) => void,
    private devices: (devices: MediaDeviceInfo[]) => void,
  ) {}
  stop(notify = true) {
    this.epoch++;
    clearInterval(this.timer);
    clearTimeout(this.timeout);
    this.stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    this.stream = undefined;
    void this.context?.close().catch(() => {});
    this.context = undefined;
    if (notify) this.changed({ status: "idle", level: 0 });
  }
  async start(device: string) {
    this.stop(false);
    const attempt = this.epoch;
    if (
      !globalThis.isSecureContext ||
      !navigator.mediaDevices?.getUserMedia ||
      !globalThis.AudioContext
    ) {
      this.changed({ status: "failed", level: 0, error: "unsupported" });
      return;
    }
    this.changed({ status: "requesting", level: 0 });
    this.timeout = setTimeout(() => this.stop(), 30000);
    try {
      const context = new AudioContext();
      this.context = context;
      // Request resume in the click gesture, before the permission promise.
      const resumed = context.resume().then(
        () => null,
        (error) => error,
      );
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: device ? { exact: device } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false,
      });
      if (attempt !== this.epoch) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      if (!stream.getAudioTracks().length)
        throw new DOMException("No audio track", "NotFoundError");
      const resumeError = await resumed;
      if (resumeError) throw resumeError;
      if (attempt !== this.epoch) return;
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(512);
      this.changed({ status: "active", level: 0 });
      this.timer = setInterval(() => {
        analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(
          samples.reduce((sum, x) => sum + x * x, 0) / samples.length,
        );
        this.changed({
          status: "active",
          level: Math.min(100, Math.round(rms * 400)),
        });
      }, 100);
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          this.stop(false);
          this.changed({ status: "failed", level: 0, error: "missing" });
        };
      });
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        if (attempt === this.epoch)
          this.devices(list.filter((d) => d.kind === "audioinput"));
      } catch {
        /* Meter remains useful without a device list. */
      }
    } catch (error) {
      if (attempt !== this.epoch) return;
      this.stop(false);
      this.changed({
        status: "failed",
        level: 0,
        error: microphoneError(error),
      });
    }
  }
}
