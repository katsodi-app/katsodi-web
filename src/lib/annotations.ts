import { z } from "zod";

/**
 * Zoom-style annotations on a link demo (TASKS.md, task 3.2). Messages travel
 * over the LiveKit data channel; the author of every mark is the sender's
 * LiveKit identity (set by the server's token), never a field in the message.
 */
export const strokeTools = ["pen", "highlighter", "arrow", "box"] as const;
export const stampKinds = ["check", "cross", "star", "question"] as const;
export type StrokeTool = (typeof strokeTools)[number];
export type StampKind = (typeof stampKinds)[number];

const unit = z.number().min(0).max(1);
const point = z.tuple([unit, unit]);
const markId = z.string().min(1).max(40);

/** A mark as stored by every client (author added on receipt). */
export const markSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("stroke"),
    id: markId,
    author: z.string().max(64),
    tool: z.enum(strokeTools),
    points: z.array(point).min(1).max(400),
  }),
  z.object({
    kind: z.literal("stamp"),
    id: markId,
    author: z.string().max(64),
    stamp: z.enum(stampKinds),
    x: unit,
    y: unit,
  }),
  z.object({
    kind: z.literal("text"),
    id: markId,
    author: z.string().max(64),
    text: z.string().min(1).max(80),
    x: unit,
    y: unit,
  }),
  z.object({
    kind: z.literal("hint"),
    id: markId,
    author: z.string().max(64),
    x: unit,
    y: unit,
  }),
]);
export type Mark = z.infer<typeof markSchema>;

export const demoSignal = z.discriminatedUnion("t", [
  z.object({
    t: z.literal("stroke"),
    id: markId,
    tool: z.enum(strokeTools),
    points: z.array(point).min(1).max(400),
  }),
  z.object({
    t: z.literal("stamp"),
    id: markId,
    stamp: z.enum(stampKinds),
    x: unit,
    y: unit,
  }),
  z.object({
    t: z.literal("text"),
    id: markId,
    text: z.string().trim().min(1).max(80),
    x: unit,
    y: unit,
  }),
  z.object({ t: z.literal("hint"), id: markId, x: unit, y: unit }),
  // The live spotlight pointer: shown briefly, never stored.
  z.object({ t: z.literal("pointer"), x: unit, y: unit }),
  z.object({ t: z.literal("erase"), ids: z.array(markId).min(1).max(50) }),
  z.object({ t: z.literal("clear"), scope: z.enum(["mine", "all"]) }),
  // Sent by the presenter to someone who just joined: the current marks.
  z.object({ t: z.literal("snapshot"), marks: z.array(markSchema).max(300) }),
]);
export type DemoSignal = z.infer<typeof demoSignal>;

/**
 * Applies one message from `author` to the shared marks. Everyone may change
 * only their own marks; "clear all" and snapshots are accepted only from
 * hosts or the presenter (`trusted`).
 */
export function applyAnnotation(
  marks: Mark[],
  signal: DemoSignal,
  author: string,
  trusted: boolean,
): Mark[] {
  switch (signal.t) {
    case "stroke": {
      const existing = marks.find((m) => m.id === signal.id);
      if (existing && existing.author !== author) return marks;
      const next: Mark = {
        kind: "stroke",
        id: signal.id,
        author,
        tool: signal.tool,
        points: signal.points,
      };
      // Strokes arrive repeatedly while drawn; the newest copy replaces it.
      return existing
        ? marks.map((m) => (m.id === signal.id ? next : m))
        : [...marks, next].slice(-300);
    }
    case "stamp":
    case "text":
    case "hint": {
      if (marks.some((m) => m.id === signal.id)) return marks;
      const next: Mark =
        signal.t === "stamp"
          ? {
              kind: "stamp",
              id: signal.id,
              author,
              stamp: signal.stamp,
              x: signal.x,
              y: signal.y,
            }
          : signal.t === "text"
            ? {
                kind: "text",
                id: signal.id,
                author,
                text: signal.text,
                x: signal.x,
                y: signal.y,
              }
            : { kind: "hint", id: signal.id, author, x: signal.x, y: signal.y };
      return [...marks, next].slice(-300);
    }
    case "erase":
      return marks.filter(
        (m) => !(signal.ids.includes(m.id) && m.author === author),
      );
    case "clear":
      return signal.scope === "all"
        ? trusted
          ? []
          : marks
        : marks.filter((m) => m.author !== author);
    case "snapshot":
      return trusted ? signal.marks.slice(-300) : marks;
    case "pointer":
      return marks;
  }
}

/** One distinct colour per person, stable for the whole demo. */
export const annotationColors = [
  "#d4ef8b",
  "#ff8fc7",
  "#7cc8ff",
  "#ffb86b",
  "#b69cff",
  "#5eead4",
] as const;
export function authorColor(author: string) {
  let hash = 0;
  for (const char of author) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return annotationColors[Math.abs(hash) % annotationColors.length];
}
