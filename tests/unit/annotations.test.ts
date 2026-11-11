import { describe, expect, it } from "vitest";
import {
  applyAnnotation,
  authorColor,
  demoSignal,
  type DemoSignal,
  type Mark,
} from "../../src/lib/annotations";

const ana = "ana",
  bob = "bob";
const stroke = (id: string, x = 0.5): DemoSignal => ({
  t: "stroke",
  id,
  tool: "pen",
  points: [
    [0.1, 0.1],
    [x, x],
  ],
});

describe("annotation rules", () => {
  it("adds marks with the sender as author and updates strokes in place", () => {
    let marks: Mark[] = [];
    marks = applyAnnotation(marks, stroke("s1", 0.2), ana, false);
    marks = applyAnnotation(marks, stroke("s1", 0.6), ana, false);
    expect(marks).toHaveLength(1);
    expect(marks[0]).toMatchObject({
      author: ana,
      points: [
        [0.1, 0.1],
        [0.6, 0.6],
      ],
    });
    marks = applyAnnotation(
      marks,
      { t: "stamp", id: "st1", stamp: "check", x: 0.3, y: 0.4 },
      bob,
      false,
    );
    expect(marks.map((m) => m.author)).toEqual([ana, bob]);
  });

  it("never lets one person change or erase another's marks", () => {
    let marks = applyAnnotation([], stroke("s1"), ana, false);
    // Bob reuses Ana's id: ignored.
    marks = applyAnnotation(marks, stroke("s1", 0.9), bob, false);
    expect(marks[0]).toMatchObject({
      author: ana,
      points: [
        [0.1, 0.1],
        [0.5, 0.5],
      ],
    });
    marks = applyAnnotation(marks, { t: "erase", ids: ["s1"] }, bob, false);
    expect(marks).toHaveLength(1);
    marks = applyAnnotation(marks, { t: "clear", scope: "mine" }, bob, false);
    expect(marks).toHaveLength(1);
    marks = applyAnnotation(marks, { t: "erase", ids: ["s1"] }, ana, false);
    expect(marks).toHaveLength(0);
  });

  it("accepts clear-all and snapshots only from hosts or the presenter", () => {
    const marks = [
      ...applyAnnotation([], stroke("a"), ana, false),
      ...applyAnnotation([], stroke("b"), bob, false),
    ];
    expect(
      applyAnnotation(marks, { t: "clear", scope: "all" }, bob, false),
    ).toHaveLength(2);
    expect(
      applyAnnotation(marks, { t: "clear", scope: "all" }, bob, true),
    ).toHaveLength(0);
    const snapshot: DemoSignal = { t: "snapshot", marks: marks.slice(0, 1) };
    expect(applyAnnotation([], snapshot, bob, false)).toHaveLength(0);
    expect(applyAnnotation([], snapshot, bob, true)).toEqual(marks.slice(0, 1));
  });

  it("rejects malformed or oversized messages", () => {
    expect(
      demoSignal.safeParse({
        t: "stroke",
        id: "x",
        tool: "laser",
        points: [[0, 0]],
      }).success,
    ).toBe(false);
    expect(
      demoSignal.safeParse({ t: "text", id: "x", text: " ", x: 0.1, y: 0.1 })
        .success,
    ).toBe(false);
    expect(
      demoSignal.safeParse({
        t: "text",
        id: "x",
        text: "a".repeat(81),
        x: 0,
        y: 0,
      }).success,
    ).toBe(false);
    expect(
      demoSignal.safeParse({ t: "hint", id: "x", x: 1.5, y: 0 }).success,
    ).toBe(false);
    expect(demoSignal.safeParse({ t: "pointer", x: 0.2, y: 0.8 }).success).toBe(
      true,
    );
  });

  it("gives each person a stable colour", () => {
    expect(authorColor(ana)).toBe(authorColor(ana));
    expect(authorColor("10000000-0000-4000-8000-000000000001")).toMatch(/^#/);
  });
});
