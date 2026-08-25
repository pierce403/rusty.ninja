import { describe, expect, it } from "vitest";
import { getRustyDialogue } from "../../src/rusty/dialogue";
import {
  getRank,
  getRustyProgression,
  getRustyStage,
} from "../../src/rusty/progression";

describe("Rusty progression", () => {
  it.each([
    [-1, 0],
    [0, 0],
    [1.99, 0],
    [2, 2],
    [4.5, 4],
    [6, 6],
    [8.99, 8],
    [10, 10],
    [11, 10],
  ])("maps rating %s to visual stage %s", (rating, expectedStage) => {
    expect(getRustyStage(rating).level).toBe(expectedStage);
  });

  it("reports interpolation progress without inventing extra image states", () => {
    expect(getRustyProgression(5)).toMatchObject({
      stage: { level: 4 },
      nextStage: { level: 6 },
      stageProgress: 0.5,
    });
    expect(getRustyProgression(10)).toMatchObject({
      stage: { level: 10 },
      nextStage: null,
      stageProgress: 1,
    });
  });

  it("makes dialogue deterministic and increasingly peer-like", () => {
    expect(getRustyDialogue(3, "same-seed")).toBe(
      getRustyDialogue(3, "same-seed"),
    );
    expect(getRustyDialogue(10, "final", "milestone")).toContain(
      "perfectly reasonable-looking Rust",
    );
  });

  it("keeps the numeric level primary while providing stable rank bands", () => {
    expect(getRank(0).name).toBe("Broken Build");
    expect(getRank(8.5).name).toBe("Soundness Hunter");
    expect(getRank(9.8).name).toBe("Unsafe Ninja");
  });
});
