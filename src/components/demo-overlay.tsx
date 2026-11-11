"use client";
import { useRef, useState } from "react";
import {
  authorColor,
  type DemoSignal,
  type Mark,
  type StampKind,
  type StrokeTool,
} from "@/lib/annotations";

export type AnnotationTool =
  StrokeTool | "text" | "hint" | "pointer" | "eraser" | `stamp:${StampKind}`;
export type Pointer = { x: number; y: number };

const stampGlyph: Record<StampKind, string> = {
  check: "✓",
  cross: "✕",
  star: "★",
  question: "?",
};
const newId = (prefix: string) =>
  `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const round = (v: number) => Math.round(clamp(v) * 1000) / 1000;

function strokeShape(mark: Extract<Mark, { kind: "stroke" }>) {
  const first = mark.points[0];
  const last = mark.points[mark.points.length - 1];
  if (mark.tool === "box") {
    const x = Math.min(first[0], last[0]),
      y = Math.min(first[1], last[1]);
    return {
      type: "rect" as const,
      x,
      y,
      width: Math.abs(last[0] - first[0]),
      height: Math.abs(last[1] - first[1]),
    };
  }
  if (mark.tool === "arrow") {
    const angle = Math.atan2(last[1] - first[1], last[0] - first[0]);
    const head = 0.035;
    const wing = (side: number) =>
      [
        last[0] - head * Math.cos(angle + side * 0.5),
        last[1] - head * Math.sin(angle + side * 0.5),
      ].join(",");
    return {
      type: "arrow" as const,
      line: `${first.join(",")} ${last.join(",")}`,
      head: `${wing(-1)} ${last.join(",")} ${wing(1)}`,
    };
  }
  return {
    type: "line" as const,
    points: mark.points.map((p) => p.join(",")).join(" "),
  };
}

/**
 * Annotations over the shared picture, in coordinates normalized to it, so
 * every screen shows them in the same place (Zoom-like: persistent until
 * cleared, a colour and name per person). Pointer input is captured only
 * while the user has a tool selected; otherwise the presenter keeps using
 * the site underneath.
 */
export function DemoOverlay({
  marks,
  pointers,
  tool,
  userId,
  nameOf,
  onSend,
  labels,
}: {
  marks: Mark[];
  pointers: Record<string, Pointer>;
  tool: AnnotationTool | null;
  userId: string;
  nameOf: (id: string) => string;
  onSend: (signal: DemoSignal) => void;
  labels: { textPlaceholder: string; annotators: string; hint: string };
}) {
  const box = useRef<HTMLDivElement>(null);
  const drawing = useRef<{
    id: string;
    tool: StrokeTool;
    points: [number, number][];
  } | null>(null);
  const lastSent = useRef(0);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);

  const point = (event: React.PointerEvent): [number, number] => {
    const rect = box.current!.getBoundingClientRect();
    return [
      round((event.clientX - rect.left) / rect.width),
      round((event.clientY - rect.top) / rect.height),
    ];
  };
  const erase = (mark: Mark) => {
    if (tool === "eraser" && mark.author === userId)
      onSend({ t: "erase", ids: [mark.id] });
  };
  const authors = [...new Set(marks.map((m) => m.author))];
  const strokeTool =
    tool && ["pen", "highlighter", "arrow", "box"].includes(tool)
      ? (tool as StrokeTool)
      : null;
  return (
    <div
      ref={box}
      className={`demo-overlay ${tool ? "is-active" : ""} ${tool === "eraser" ? "is-erasing" : ""}`}
      data-tool={tool ?? undefined}
      onPointerDown={(event) => {
        if (!tool || tool === "eraser" || draft) return;
        if ((event.target as HTMLElement).closest(".demo-text-draft")) return;
        event.preventDefault();
        const [x, y] = point(event);
        if (strokeTool) {
          box.current?.setPointerCapture(event.pointerId);
          drawing.current = {
            id: newId("s"),
            tool: strokeTool,
            points: [[x, y]],
          };
        } else if (tool === "text") setDraft({ x, y });
        else if (tool === "hint") onSend({ t: "hint", id: newId("h"), x, y });
        else if (tool.startsWith("stamp:"))
          onSend({
            t: "stamp",
            id: newId("m"),
            stamp: tool.slice(6) as StampKind,
            x,
            y,
          });
      }}
      onPointerMove={(event) => {
        if (tool === "pointer") {
          if (Date.now() - lastSent.current < 70) return;
          lastSent.current = Date.now();
          const [x, y] = point(event);
          onSend({ t: "pointer", x, y });
          return;
        }
        const stroke = drawing.current;
        if (!stroke || stroke.points.length >= 400) return;
        const next = point(event);
        if (stroke.tool === "arrow" || stroke.tool === "box")
          stroke.points = [stroke.points[0], next];
        else stroke.points.push(next);
        if (Date.now() - lastSent.current > 80) {
          lastSent.current = Date.now();
          onSend({
            t: "stroke",
            id: stroke.id,
            tool: stroke.tool,
            points: [...stroke.points],
          });
        }
      }}
      onPointerUp={() => {
        const stroke = drawing.current;
        drawing.current = null;
        if (stroke)
          onSend({
            t: "stroke",
            id: stroke.id,
            tool: stroke.tool,
            points: stroke.points,
          });
      }}
    >
      <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
        {marks.map((mark) => {
          if (mark.kind !== "stroke") return null;
          const color = authorColor(mark.author);
          const shape = strokeShape(mark);
          const title = <title>{nameOf(mark.author)}</title>;
          if (mark.tool === "highlighter" && shape.type === "line")
            return (
              <polyline
                key={mark.id}
                className="demo-stroke demo-highlighter"
                data-author={mark.author}
                points={shape.points}
                stroke={color}
                onClick={() => erase(mark)}
              >
                {title}
              </polyline>
            );
          return (
            <g
              key={mark.id}
              className={`demo-stroke demo-${mark.tool}`}
              data-author={mark.author}
              onClick={() => erase(mark)}
            >
              {title}
              {shape.type === "rect" ? (
                <>
                  <rect
                    className="demo-under"
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                  />
                  <rect
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    stroke={color}
                  />
                </>
              ) : shape.type === "arrow" ? (
                <>
                  <polyline className="demo-under" points={shape.line} />
                  <polyline className="demo-under" points={shape.head} />
                  <polyline points={shape.line} stroke={color} />
                  <polyline points={shape.head} stroke={color} />
                </>
              ) : (
                <>
                  <polyline className="demo-under" points={shape.points} />
                  <polyline points={shape.points} stroke={color} />
                </>
              )}
            </g>
          );
        })}
      </svg>
      {marks.map((mark) =>
        mark.kind === "stroke" ? null : (
          <span
            key={mark.id}
            className={`demo-mark demo-${mark.kind}`}
            data-author={mark.author}
            style={
              {
                left: `${mark.x * 100}%`,
                top: `${mark.y * 100}%`,
                "--mark-color": authorColor(mark.author),
              } as React.CSSProperties
            }
            onClick={() => erase(mark)}
            title={nameOf(mark.author)}
          >
            {mark.kind === "stamp"
              ? stampGlyph[mark.stamp]
              : mark.kind === "text"
                ? mark.text
                : null}
            {mark.kind === "hint" && (
              <span className="demo-hint-label">{labels.hint}</span>
            )}
            <span className="demo-author">{nameOf(mark.author)}</span>
          </span>
        ),
      )}
      {Object.entries(pointers).map(([author, p]) => (
        <span
          key={author}
          className="demo-pointer"
          style={
            {
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              "--mark-color": authorColor(author),
            } as React.CSSProperties
          }
        >
          <span className="demo-author">{nameOf(author)}</span>
        </span>
      ))}
      {draft && (
        <form
          className="demo-text-draft"
          style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }}
          onSubmit={(event) => {
            event.preventDefault();
            const text = String(
              new FormData(event.currentTarget).get("text") ?? "",
            ).trim();
            if (text)
              onSend({
                t: "text",
                id: newId("t"),
                text: text.slice(0, 80),
                x: draft.x,
                y: draft.y,
              });
            setDraft(null);
          }}
        >
          <input
            name="text"
            autoFocus
            maxLength={80}
            aria-label={labels.textPlaceholder}
            placeholder={labels.textPlaceholder}
            onKeyDown={(event) => {
              if (event.key === "Escape") setDraft(null);
            }}
          />
        </form>
      )}
      {authors.length > 0 && (
        <ul className="demo-legend" aria-label={labels.annotators}>
          {authors.map((author) => (
            <li
              key={author}
              style={
                { "--mark-color": authorColor(author) } as React.CSSProperties
              }
            >
              {nameOf(author)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
