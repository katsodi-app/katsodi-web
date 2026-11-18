import { z } from "zod";

/**
 * Controlling a desktop presenter's shared browser from the website: the
 * same LiveKit data channel and messages as the native client
 * (https://github.com/katsodi-app/katsodi-desktop, ScreenController). The presenter's app
 * applies input only from people on its access list, and LiveKit lets a
 * member send data only while a host opened the demo channel.
 */
export const COBROWSE_TOPIC = "katsodi-cobrowse";

/** The presenter's access list, as it broadcasts it. */
export const controlMessage = z.object({
  t: z.literal("control"),
  all: z.boolean(),
  ids: z.array(z.string().max(64)).max(200),
});

export type CobrowseInput =
  | {
      type: "mouse";
      action: "move" | "down" | "up" | "wheel";
      x: number;
      y: number;
      button: "none" | "left" | "middle" | "right";
      clicks?: number;
      dx?: number;
      dy?: number;
    }
  | {
      type: "key";
      action: "down" | "up";
      key: string;
      code: string;
      vk: number;
      modifiers: number;
      text?: string;
    }
  | { type: "text"; text: string };

/** Whether a control message from `sender` grants this viewer control. */
export function grantsControl(
  data: unknown,
  sender: string,
  presenter: string,
  me: string,
): boolean | null {
  if (sender.toLowerCase() !== presenter.toLowerCase()) return null;
  const parsed = controlMessage.safeParse(data);
  if (!parsed.success) return null;
  return (
    parsed.data.all ||
    parsed.data.ids.some((id) => id.toLowerCase() === me.toLowerCase())
  );
}

/**
 * A pointer position as a fraction of the shared picture, which is shown
 * "contained" (letterboxed) in its element. Outside the picture: null.
 */
export function pictureFraction(
  box: { left: number; top: number; width: number; height: number },
  picture: { width: number; height: number },
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  if (box.width <= 0 || box.height <= 0) return null;
  const ratio =
    picture.width > 0 && picture.height > 0
      ? picture.width / picture.height
      : box.width / box.height;
  let width = box.width;
  let height = box.width / ratio;
  if (height > box.height) {
    height = box.height;
    width = box.height * ratio;
  }
  const left = box.left + (box.width - width) / 2;
  const top = box.top + (box.height - height) / 2;
  const x = (clientX - left) / width;
  const y = (clientY - top) / height;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  return { x, y };
}

export const mouseButton = (button: number): "left" | "middle" | "right" =>
  button === 1 ? "middle" : button === 2 ? "right" : "left";

const SPECIAL: Record<string, number> = {
  Enter: 13,
  Backspace: 8,
  Tab: 9,
  Escape: 27,
  Delete: 46,
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  Home: 36,
  End: 35,
  PageUp: 33,
  PageDown: 34,
};

/**
 * A browser key event as shared-browser input: special keys as key events,
 * Ctrl+letter (select all, undo, redo; the presenter drops the rest), and
 * printed characters as text in any language. Alt/Meta combinations and
 * anything else: null (not sent).
 */
export function keyInput(
  event: {
    key: string;
    code: string;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
  },
  action: "down" | "up",
): CobrowseInput | null {
  if (event.altKey || event.metaKey) return null;
  const modifiers = (event.ctrlKey ? 2 : 0) | (event.shiftKey ? 8 : 0);
  const vk = SPECIAL[event.key];
  if (vk)
    return {
      type: "key",
      action,
      key: event.key,
      code: event.code || event.key,
      vk,
      modifiers,
      text: event.key === "Enter" && action === "down" ? "\r" : "",
    };
  if (event.ctrlKey && /^[a-z]$/i.test(event.key)) {
    const letter = event.key.toLowerCase();
    return {
      type: "key",
      action,
      key: letter,
      code: `Key${letter.toUpperCase()}`,
      vk: letter.toUpperCase().charCodeAt(0),
      modifiers,
    };
  }
  if (
    action === "down" &&
    !event.ctrlKey &&
    [...event.key].length === 1 &&
    event.key >= " "
  )
    return { type: "text", text: event.key };
  return null;
}

/** The bytes sent on the channel for one input. */
export function encodeInput(input: CobrowseInput): Uint8Array<ArrayBuffer> {
  return new Uint8Array(
    new TextEncoder().encode(JSON.stringify({ t: "input", ...input })),
  );
}
