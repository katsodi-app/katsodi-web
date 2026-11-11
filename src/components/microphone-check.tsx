"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Mic, MicOff, ChevronDown, ShieldCheck } from "lucide-react";
import { MicrophoneTest, type MicrophoneState } from "@/lib/microphone-test";
import { useWorkspace } from "./workspace-provider";
export function MicrophoneCheck({
  device,
  onDevice,
}: {
  device: string;
  onDevice: (device: string) => void;
}) {
  const { t } = useWorkspace(),
    m = t.micTest;
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="mic-check">
      <button
        type="button"
        className="mic-check-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <Mic size={15} />
        {m.title}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div id={id}>
          <MicrophonePanel device={device} onDevice={onDevice} />
        </div>
      )}
    </div>
  );
}
function MicrophonePanel({
  device,
  onDevice,
}: {
  device: string;
  onDevice: (device: string) => void;
}) {
  const { t } = useWorkspace(),
    m = t.micTest;
  const [state, setState] = useState<MicrophoneState>({
      status: "idle",
      level: 0,
    }),
    [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const test = useRef<MicrophoneTest | null>(null),
    deviceId = useId();
  useEffect(() => {
    const probe = new MicrophoneTest(setState, setDevices);
    test.current = probe;
    const stop = () => probe.stop();
    const visibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", stop);
    return () => {
      probe.stop(false);
      test.current = null;
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", stop);
    };
  }, []);
  const active = state.status === "active",
    requesting = state.status === "requesting";
  return (
    <div className="mic-check-panel">
      <p>{m.hint}</p>
      <label htmlFor={deviceId}>{t.voice.input}</label>
      <select
        id={deviceId}
        value={device}
        disabled={requesting}
        onChange={(e) => {
          test.current?.stop();
          onDevice(e.target.value);
        }}
      >
        <option value="">{t.voice.defaultDevice}</option>
        {devices
          .filter((d) => d.deviceId !== "default")
          .map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || t.voice.input}
            </option>
          ))}
      </select>
      <div
        className="mic-meter"
        role="meter"
        aria-label={m.level}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={state.level}
      >
        <span style={{ width: `${state.level}%` }} />
      </div>
      <div className="mic-check-status">
        <span role="status">
          {active ? m.active : requesting ? m.requesting : m.idle}
        </span>
        <button
          type="button"
          className="button button-secondary button-small"
          onClick={() =>
            active || requesting
              ? test.current?.stop()
              : void test.current?.start(device)
          }
        >
          {active || requesting ? <MicOff size={14} /> : <Mic size={14} />}{" "}
          {active ? m.stop : requesting ? m.cancel : m.start}
        </button>
      </div>
      {state.status === "failed" && (
        <p role="alert" className="mic-check-error">
          {m[state.error || "failed"]}
        </p>
      )}
      <small>
        <ShieldCheck size={13} />
        {m.privacy}
      </small>
    </div>
  );
}
