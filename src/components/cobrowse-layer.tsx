"use client";

import { useEffect, useRef } from "react";
import type { Room as LiveKitRoom } from "livekit-client";
import {
  COBROWSE_TOPIC,
  type CobrowseInput,
  encodeInput,
  keyInput,
  mouseButton,
  pictureFraction,
} from "@/lib/cobrowse";

/**
 * A transparent layer over the demo video while the desktop presenter lets
 * this viewer control their shared browser: clicks, wheel and keys go to
 * the presenter only, on the shared-browser channel. Pointer moves are sent
 * at most ~30 times a second and may be lost; the rest is reliable.
 */
export function CobrowseLayer({
  room,
  presenter,
  label,
}: {
  room: LiveKitRoom | null;
  presenter: string;
  label: string;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const lastMove = useRef(0);

  useEffect(() => {
    const element = layer.current;
    if (!element || !room) return;
    const send = (input: CobrowseInput) => {
      const reliable = !(input.type === "mouse" && input.action === "move");
      void room.localParticipant
        .publishData(encodeInput(input), {
          reliable,
          topic: COBROWSE_TOPIC,
          destinationIdentities: [presenter],
        })
        .catch(() => {});
    };
    const at = (event: { clientX: number; clientY: number }) => {
      const video = element.parentElement?.querySelector("video");
      const box = (video ?? element).getBoundingClientRect();
      return pictureFraction(
        box,
        { width: video?.videoWidth ?? 0, height: video?.videoHeight ?? 0 },
        event.clientX,
        event.clientY,
      );
    };
    const move = (event: PointerEvent) => {
      const now = performance.now();
      if (now - lastMove.current < 33) return;
      lastMove.current = now;
      const p = at(event);
      if (p) send({ type: "mouse", action: "move", ...p, button: "none" });
    };
    const press = (action: "down" | "up") => (event: PointerEvent) => {
      const p = at(event);
      if (!p) return;
      event.preventDefault();
      if (action === "down") element.focus();
      send({
        type: "mouse",
        action,
        ...p,
        button: mouseButton(event.button),
        clicks: Math.min(3, Math.max(1, event.detail || 1)),
      });
    };
    const wheel = (event: WheelEvent) => {
      const p = at(event);
      if (!p) return;
      event.preventDefault(); // scroll the shared page, not this one
      send({
        type: "mouse",
        action: "wheel",
        ...p,
        button: "none",
        dx: event.deltaX,
        dy: event.deltaY,
      });
    };
    const key = (action: "down" | "up") => (event: KeyboardEvent) => {
      const input = keyInput(event, action);
      if (!input) return;
      event.preventDefault();
      send(input);
    };
    const menu = (event: Event) => event.preventDefault();
    const down = press("down");
    const up = press("up");
    const keyDown = key("down");
    const keyUp = key("up");
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointerup", up);
    element.addEventListener("wheel", wheel, { passive: false });
    element.addEventListener("keydown", keyDown);
    element.addEventListener("keyup", keyUp);
    element.addEventListener("contextmenu", menu);
    return () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("wheel", wheel);
      element.removeEventListener("keydown", keyDown);
      element.removeEventListener("keyup", keyUp);
      element.removeEventListener("contextmenu", menu);
    };
  }, [room, presenter]);

  return (
    <div
      ref={layer}
      className="cobrowse-layer"
      tabIndex={0}
      role="application"
      aria-label={label}
    >
      <span className="cobrowse-badge">{label}</span>
    </div>
  );
}
