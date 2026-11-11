"use client";
import {
  Children,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  GripVertical,
  Maximize2,
  Minimize2,
  Minus,
  MoveUpRight,
  PanelLeft,
  PanelRight,
  RotateCcw,
  Pin,
  Scaling,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";

const StageWithChatContext = createContext<(() => void) | null>(null);
export const useStageWithChat = () => useContext(StageWithChatContext);

type PaneId = "player" | "side";
type Frame = {
  floating: boolean;
  sized: boolean;
  minimized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};
const initialFrames = (): Record<PaneId, Frame> => ({
  player: {
    floating: false,
    sized: false,
    minimized: false,
    x: 12,
    y: 12,
    width: 720,
    height: 480,
  },
  side: {
    floating: false,
    sized: false,
    minimized: false,
    x: 24,
    y: 24,
    width: 380,
    height: 480,
  },
});
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, Math.max(min, max)));

const constrain = (frame: Frame, width: number, height: number): Frame => {
  const w = clamp(frame.width, Math.min(260, width), width);
  const h = clamp(frame.height, Math.min(180, height), height);
  return {
    ...frame,
    width: w,
    height: h,
    x: clamp(frame.x, 0, width - w),
    y: clamp(frame.y, 0, height - Math.min(h, frame.minimized ? 48 : h)),
  };
};

/** Stable pane DOM: docking, dragging and collapsing never reparent media. */
export function RoomLayout({
  children,
  className = "room-body",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { t } = useWorkspace();
  const labels = t.roomStudio;
  const root = useRef<HTMLDivElement>(null);
  const [frames, setFrames] = useState(initialFrames);
  const [sideWidth, setSideWidth] = useState(380);
  const [left, setLeft] = useState(false);
  const [focus, setFocus] = useState<PaneId | null>(null);
  const [sizeEditor, setSizeEditor] = useState<PaneId | null>(null);
  const drag = useRef<{
    id: PaneId;
    kind: "move" | "size";
    x: number;
    y: number;
    frame: Frame;
  } | null>(null);
  const panes = Children.toArray(children);
  const update = (id: PaneId, patch: Partial<Frame>) =>
    setFrames((old) => ({ ...old, [id]: { ...old[id], ...patch } }));
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const { width, height } = element.getBoundingClientRect();
      setFrames((old) => {
        const player = constrain(old.player, width, height);
        const side = constrain(old.side, width, height);
        return JSON.stringify([player, side]) ===
          JSON.stringify([old.player, old.side])
          ? old
          : { player, side };
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  function limits(id: PaneId, floating = frames[id].floating) {
    const bounds = root.current!.getBoundingClientRect();
    const side = root
      .current!.querySelector(".pane-side")!
      .getBoundingClientRect();
    return {
      width:
        getComputedStyle(root.current!).display === "grid" &&
        !floating &&
        id === "player" &&
        !focus &&
        !frames.side.floating &&
        !frames.player.minimized
          ? Math.max(260, bounds.width - side.width - 8)
          : bounds.width,
      height: bounds.height,
    };
  }
  function start(
    event: PointerEvent<HTMLElement>,
    id: PaneId,
    kind: "move" | "size",
  ) {
    if (event.button !== 0 || !root.current) return;
    event.preventDefault();
    const bounds = root.current.getBoundingClientRect();
    const pane = event.currentTarget
      .closest<HTMLElement>(".adjustable-pane")!
      .getBoundingClientRect();
    const frame = frames[id].floating
      ? frames[id]
      : constrain(
          {
            ...frames[id],
            floating: kind === "move",
            x: pane.left - bounds.left,
            y: pane.top - bounds.top,
            width: pane.width,
            height: kind === "move" ? Math.min(pane.height, 600) : pane.height,
          },
          bounds.width,
          bounds.height,
        );
    const next = {
      ...frame,
      floating: kind === "move" || frame.floating,
      sized: kind === "size" || frame.sized,
    };
    update(id, next);
    drag.current = {
      id,
      kind,
      x: event.clientX,
      y: event.clientY,
      frame: next,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLElement>) {
    const current = drag.current;
    if (!current || !root.current) return;
    const dx = event.clientX - current.x,
      dy = event.clientY - current.y;
    const { width, height } = limits(current.id, current.frame.floating);
    update(
      current.id,
      constrain(
        {
          ...current.frame,
          ...(current.kind === "move"
            ? { x: current.frame.x + dx, y: current.frame.y + dy }
            : {
                width: current.frame.width + dx,
                height: current.frame.height + dy,
              }),
        },
        width,
        height,
      ),
    );
  }
  function splitter(clientX: number) {
    if (!root.current) return;
    const bounds = root.current.getBoundingClientRect();
    setSideWidth(
      clamp(
        left ? clientX - bounds.left : bounds.right - clientX,
        260,
        Math.min(680, bounds.width * 0.6),
      ),
    );
  }
  const action = (label: string, icon: ReactNode, onClick: () => void) => (
    <button type="button" aria-label={label} title={label} onClick={onClick}>
      {icon}
    </button>
  );
  function pane(id: PaneId, content: ReactNode) {
    const frame = frames[id];
    return (
      <section
        className={`adjustable-pane pane-${id} ${frame.floating && !focus ? "is-floating" : ""} ${frame.sized && !focus && !frame.minimized ? "has-custom-size" : ""} ${frame.sized && !frame.floating && !focus && !frame.minimized ? "is-sized" : ""} ${frame.minimized && !focus ? "is-minimized" : ""}`}
        aria-label={id === "player" ? labels.player : labels.sidebar}
        style={
          {
            "--pane-x": `${frame.x}px`,
            "--pane-y": `${frame.y}px`,
            "--pane-width": `${frame.width}px`,
            "--pane-height": `${frame.height}px`,
          } as CSSProperties
        }
      >
        <header className="pane-handle">
          <button
            type="button"
            className="pane-grip"
            aria-label={`${labels.drag}: ${id === "player" ? labels.player : labels.sidebar}`}
            title={labels.drag}
            onPointerDown={(event) => start(event, id, "move")}
            onPointerMove={move}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            onKeyDown={(event) => {
              if (!event.key.startsWith("Arrow")) return;
              event.preventDefault();
              const step = event.shiftKey ? 40 : 10;
              const bounds = root.current!.getBoundingClientRect();
              const actual = event.currentTarget
                .closest(".adjustable-pane")!
                .getBoundingClientRect();
              update(
                id,
                constrain(
                  {
                    ...frame,
                    floating: true,
                    x:
                      (frame.floating ? frame.x : actual.left - bounds.left) +
                      (event.key === "ArrowRight"
                        ? step
                        : event.key === "ArrowLeft"
                          ? -step
                          : 0),
                    y:
                      (frame.floating ? frame.y : actual.top - bounds.top) +
                      (event.key === "ArrowDown"
                        ? step
                        : event.key === "ArrowUp"
                          ? -step
                          : 0),
                  },
                  bounds.width,
                  bounds.height,
                ),
              );
            }}
          >
            <GripVertical size={16} />
          </button>
          <span>{id === "player" ? labels.player : labels.sidebar}</span>
          <div className="pane-actions">
            {id === "player" &&
              action(labels.reset, <RotateCcw size={14} />, () => {
                setFrames(initialFrames());
                setSizeEditor(null);
                setFocus(null);
                setLeft(false);
                setSideWidth(380);
              })}
            {id === "player" && !frame.minimized && (
              <button
                type="button"
                aria-label={labels.sizeStage}
                title={labels.sizeStage}
                aria-expanded={sizeEditor === id}
                onClick={(event) => {
                  const bounds = event.currentTarget
                    .closest(".adjustable-pane")!
                    .getBoundingClientRect();
                  update(id, { width: bounds.width, height: bounds.height });
                  setSizeEditor(sizeEditor === id ? null : id);
                }}
              >
                <Scaling size={15} />
              </button>
            )}
            {id === "side" &&
              action(
                left ? labels.right : labels.left,
                left ? <PanelRight size={15} /> : <PanelLeft size={15} />,
                () => {
                  setLeft(!left);
                  update(id, { floating: false, sized: false });
                },
              )}
            {action(
              frame.floating ? labels.dock : labels.floating,
              frame.floating ? <Pin size={15} /> : <MoveUpRight size={15} />,
              () => {
                setFocus(null);
                update(id, {
                  floating: !frame.floating,
                  minimized: false,
                  sized: false,
                });
              },
            )}
            {action(
              focus === id ? labels.restore : labels.expand,
              focus === id ? <Minimize2 size={15} /> : <Maximize2 size={15} />,
              () => {
                update(id, { minimized: false });
                setFocus(focus === id ? null : id);
              },
            )}
            {action(
              frame.minimized ? labels.restore : labels.minimize,
              frame.minimized ? <Maximize2 size={15} /> : <Minus size={15} />,
              () => {
                setFocus(null);
                setSizeEditor(null);
                update(id, { minimized: !frame.minimized });
              },
            )}
          </div>
          {sizeEditor === id && (
            <form
              className="pane-size-controls"
              aria-label={labels.sizeStage}
              onSubmit={(event) => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                const bounds = limits(id);
                update(
                  id,
                  constrain(
                    {
                      ...frame,
                      sized: true,
                      width: Number(values.get("width")) || frame.width,
                      height: Number(values.get("height")) || frame.height,
                    },
                    bounds.width,
                    bounds.height,
                  ),
                );
                setFocus(null);
                setSizeEditor(null);
              }}
            >
              <label>
                {labels.width}
                <input
                  name="width"
                  type="number"
                  min={Math.min(260, frame.width)}
                  step="1"
                  defaultValue={Math.round(frame.width)}
                  required
                />
              </label>
              <label>
                {labels.height}
                <input
                  name="height"
                  type="number"
                  min="180"
                  step="1"
                  defaultValue={Math.round(frame.height)}
                  required
                />
              </label>
              <div>
                <button type="submit">{labels.applySize}</button>
                <button
                  type="button"
                  onClick={() => {
                    update(id, {
                      sized: false,
                      floating: false,
                      minimized: false,
                    });
                    setFocus(null);
                    setSizeEditor(null);
                  }}
                >
                  {labels.fitSize}
                </button>
              </div>
            </form>
          )}
        </header>
        <div
          className="pane-content"
          inert={frame.minimized && !focus ? true : undefined}
        >
          {content}
        </div>
        <button
          type="button"
          className="pane-resize"
          aria-label={
            frame.floating ? labels.resizeFloating : labels.resizeStage
          }
          title={frame.floating ? labels.resizeFloating : labels.resizeStage}
          onPointerDown={(event) => start(event, id, "size")}
          onPointerMove={move}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onKeyDown={(event) => {
            if (!event.key.startsWith("Arrow")) return;
            event.preventDefault();
            const bounds = limits(id);
            const actual = event.currentTarget
              .closest(".adjustable-pane")!
              .getBoundingClientRect();
            update(
              id,
              constrain(
                {
                  ...frame,
                  sized: true,
                  width:
                    actual.width +
                    (event.key === "ArrowRight"
                      ? 20
                      : event.key === "ArrowLeft"
                        ? -20
                        : 0),
                  height:
                    actual.height +
                    (event.key === "ArrowDown"
                      ? 20
                      : event.key === "ArrowUp"
                        ? -20
                        : 0),
                },
                bounds.width,
                bounds.height,
              ),
            );
          }}
        >
          <Scaling size={16} />
        </button>
      </section>
    );
  }
  return (
    <StageWithChatContext.Provider
      value={() => {
        setFocus(null);
        setFrames((old) => ({
          player: {
            ...old.player,
            floating: false,
            sized: false,
            minimized: false,
          },
          side: { ...old.side, floating: false, minimized: false },
        }));
      }}
    >
      <div
        ref={root}
        className={`${className} room-adjustable`}
        data-left={left}
        data-focus={focus || ""}
        data-player-min={frames.player.minimized}
        data-side-min={frames.side.minimized}
        data-player-float={frames.player.floating && !focus}
        data-side-float={frames.side.floating && !focus}
        style={{ "--side-width": `${sideWidth}px` } as CSSProperties}
      >
        {pane("player", panes[0])}
        <div
          className="room-splitter"
          role="separator"
          tabIndex={0}
          aria-label={labels.resize}
          aria-orientation="vertical"
          aria-valuemin={260}
          aria-valuemax={680}
          aria-valuenow={Math.round(sideWidth)}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            splitter(event.clientX);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              splitter(event.clientX);
          }}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const width = root.current?.clientWidth || 1000;
            setSideWidth(
              event.key === "Home"
                ? 260
                : event.key === "End"
                  ? Math.min(680, width * 0.6)
                  : clamp(
                      sideWidth +
                        (event.key === "ArrowRight"
                          ? left
                            ? 24
                            : -24
                          : left
                            ? -24
                            : 24),
                      260,
                      Math.min(680, width * 0.6),
                    ),
            );
          }}
        />
        {pane("side", panes[1])}
      </div>
    </StageWithChatContext.Provider>
  );
}
