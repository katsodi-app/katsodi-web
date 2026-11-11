import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MicrophoneTest, microphoneError } from "../../src/lib/microphone-test";
let stop: ReturnType<typeof vi.fn>,
  close: ReturnType<typeof vi.fn>,
  getMedia: ReturnType<typeof vi.fn>,
  changed: ReturnType<typeof vi.fn>,
  devices: ReturnType<typeof vi.fn>;
let track: { stop: ReturnType<typeof vi.fn>; onended: null | (() => void) },
  stream: MediaStream;
beforeEach(() => {
  vi.useFakeTimers();
  stop = vi.fn();
  close = vi.fn().mockResolvedValue(undefined);
  getMedia = vi.fn();
  changed = vi.fn();
  devices = vi.fn();
  track = { stop, onended: null };
  stream = {
    getTracks: () => [track],
    getAudioTracks: () => [track],
  } as unknown as MediaStream;
  getMedia.mockResolvedValue(stream);
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: getMedia,
      enumerateDevices: async () => [{ kind: "audioinput", deviceId: "test" }],
    },
  });
  vi.stubGlobal(
    "AudioContext",
    class {
      resume = async () => {};
      close = close;
      createAnalyser = () => ({
        fftSize: 512,
        getFloatTimeDomainData: (data: Float32Array) => data.fill(0.1),
      });
      createMediaStreamSource = () => ({ connect: vi.fn() });
    },
  );
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("analyses signal locally, requests audio only and stops automatically", async () => {
  const probe = new MicrophoneTest(changed, devices);
  expect(getMedia).not.toHaveBeenCalled();
  await probe.start("chosen");
  expect(getMedia).toHaveBeenCalledWith({
    audio: {
      deviceId: { exact: "chosen" },
      echoCancellation: true,
      noiseSuppression: true,
    },
    video: false,
  });
  await vi.advanceTimersByTimeAsync(100);
  expect(changed).toHaveBeenLastCalledWith({ status: "active", level: 40 });
  await vi.advanceTimersByTimeAsync(30000);
  expect(stop).toHaveBeenCalledTimes(1);
  expect(close).toHaveBeenCalledTimes(1);
  expect(changed).toHaveBeenLastCalledWith({ status: "idle", level: 0 });
});
it("stops a stream arriving after cancellation instead of reviving the test", async () => {
  let resolve: (s: MediaStream) => void = () => {};
  getMedia.mockImplementation(
    () =>
      new Promise<MediaStream>((r) => {
        resolve = r;
      }),
  );
  const probe = new MicrophoneTest(changed, devices),
    pending = probe.start("");
  probe.stop();
  resolve(stream);
  await pending;
  expect(stop).toHaveBeenCalledTimes(1);
  expect(close).toHaveBeenCalledTimes(1);
  expect(changed.mock.calls.some(([s]) => s.status === "active")).toBe(false);
});
it("cleans up after device loss and reports the specific error", async () => {
  const probe = new MicrophoneTest(changed, devices);
  await probe.start("");
  track.onended?.();
  expect(stop).toHaveBeenCalledTimes(1);
  expect(changed).toHaveBeenLastCalledWith({
    status: "failed",
    level: 0,
    error: "missing",
  });
  getMedia.mockRejectedValue({ name: "NotAllowedError" });
  await probe.start("");
  expect(changed).toHaveBeenLastCalledWith({
    status: "failed",
    level: 0,
    error: "denied",
  });
});
it("classifies permission/device failures and never captures in an unsupported context", async () => {
  for (const [name, expected] of [
    ["SecurityError", "denied"],
    ["NotFoundError", "missing"],
    ["NotReadableError", "busy"],
    ["OverconstrainedError", "device"],
    ["Other", "failed"],
  ])
    expect(microphoneError({ name })).toBe(expected);
  vi.stubGlobal("isSecureContext", false);
  await new MicrophoneTest(changed, devices).start("");
  expect(getMedia).not.toHaveBeenCalled();
  expect(changed).toHaveBeenCalledWith({
    status: "failed",
    level: 0,
    error: "unsupported",
  });
});
