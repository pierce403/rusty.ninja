import { describe, expect, it } from "vitest";
import { createRng } from "../../src/game/rng";

describe("seeded RNG", () => {
  it("has a stable cross-runtime sequence", () => {
    const rng = createRng("rusty.ninja");
    expect(Array.from({ length: 6 }, () => rng.next())).toEqual([
      0.24877562560141087,
      0.30239496077410877,
      0.13329560030251741,
      0.5397425645496696,
      0.6132800439372659,
      0.06527002155780792,
    ]);
  });

  it("replays every helper deterministically", () => {
    const sample = () => {
      const rng = createRng("audit-403");
      return {
        number: rng.int(4, 32),
        flag: rng.bool(0.8),
        item: rng.pick(["u16", "u32", "usize"]),
        shuffled: rng.shuffle([1, 2, 3, 4]),
        weighted: rng.weightedPick(["rare", "common"], [1, 20]),
      };
    };
    expect(sample()).toEqual(sample());
  });

  it("forks independent streams without consuming the parent", () => {
    const left = createRng("root");
    const right = createRng("root");
    expect(left.fork("code").next()).toBe(right.fork("code").next());
    expect(left.next()).toBe(right.next());
    expect(left.fork("answers").next()).not.toBe(left.fork("code").next());
  });

  it("rejects invalid ranges and empty collections", () => {
    const rng = createRng("guards");
    expect(() => rng.int(2, 1)).toThrow(RangeError);
    expect(() => rng.float(1, 1)).toThrow(RangeError);
    expect(() => rng.bool(1.1)).toThrow(RangeError);
    expect(() => rng.pick([])).toThrow(RangeError);
    expect(() => rng.weightedPick([1], [0])).toThrow(RangeError);
  });
});
