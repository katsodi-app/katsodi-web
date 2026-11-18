import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  encodeInput,
  grantsControl,
  keyInput,
  mouseButton,
  pictureFraction,
} from "@/lib/cobrowse";

const presenter = "40000000-0000-4000-8000-000000000004";
const me = "50000000-0000-4000-8000-000000000005";
const key = (over: Partial<Parameters<typeof keyInput>[0]>) => ({
  key: "a",
  code: "KeyA",
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  ...over,
});

describe("controlling the app's shared browser from the website", () => {
  it("trusts only the presenter's access list", () => {
    const list = { t: "control", all: false, ids: [me.toUpperCase()] };
    expect(grantsControl(list, presenter, presenter, me)).toBe(true);
    expect(grantsControl({ ...list, ids: [] }, presenter, presenter, me)).toBe(
      false,
    );
    expect(
      grantsControl({ ...list, all: true, ids: [] }, presenter, presenter, me),
    ).toBe(true);
    // Anyone else announcing access is ignored, as is a malformed message.
    expect(grantsControl({ ...list, all: true }, me, presenter, me)).toBeNull();
    expect(
      grantsControl({ t: "control" }, presenter, presenter, me),
    ).toBeNull();
    expect(grantsControl("x", presenter, presenter, me)).toBeNull();
  });

  it("maps a pointer into the letterboxed picture", () => {
    const box = { left: 100, top: 50, width: 800, height: 600 };
    const wide = { width: 1600, height: 900 }; // 800×450, bars above and below
    expect(pictureFraction(box, wide, 500, 350)).toEqual({ x: 0.5, y: 0.5 });
    expect(pictureFraction(box, wide, 100, 125)).toEqual({ x: 0, y: 0 });
    expect(pictureFraction(box, wide, 500, 100)).toBeNull(); // on the bar
    expect(pictureFraction({ ...box, width: 0 }, wide, 1, 1)).toBeNull();
    expect(mouseButton(2)).toBe("right");
    expect(mouseButton(0)).toBe("left");
  });

  it("sends text as text and only safe keys", () => {
    expect(keyInput(key({ key: "ж", code: "Semicolon" }), "down")).toEqual({
      type: "text",
      text: "ж",
    });
    expect(keyInput(key({ key: "ж" }), "up")).toBeNull();
    expect(
      keyInput(key({ key: "Enter", code: "Enter" }), "down"),
    ).toMatchObject({
      type: "key",
      vk: 13,
      text: "\r",
    });
    expect(keyInput(key({ key: "v", ctrlKey: true }), "down")).toMatchObject({
      type: "key",
      key: "v",
      modifiers: 2,
    });
    expect(keyInput(key({ key: "F4", altKey: true }), "down")).toBeNull();
    expect(
      keyInput(key({ key: "Shift", code: "ShiftLeft" }), "down"),
    ).toBeNull();
    const bytes = encodeInput({ type: "text", text: "hi" });
    expect(JSON.parse(new TextDecoder().decode(bytes))).toEqual({
      t: "input",
      type: "text",
      text: "hi",
    });
  });
});

it("styles the control layer to cover the whole picture", () => {
  // Without these rules the layer has no size and takes no clicks at all.
  const css = readFileSync("src/app/room.css", "utf8");
  const rule = /\.cobrowse-layer\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
  expect(rule).toMatch(/position:\s*absolute/);
  expect(rule).toMatch(/inset:\s*0/);
  expect(rule).toMatch(/z-index:\s*[1-9]/);
  const badge = /\.cobrowse-badge\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
  expect(badge).toMatch(/pointer-events:\s*none/);
});
