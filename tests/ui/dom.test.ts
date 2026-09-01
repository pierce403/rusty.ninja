import { describe, expect, it } from "vitest";
import { formatDelta } from "../../src/ui/dom";

describe("rating delta formatting", () => {
  it("does not label a small nonzero gain as zero", () => {
    expect(formatDelta(0.0035)).toBe("+0.004");
  });

  it("keeps exact zero distinct from small changes", () => {
    expect(formatDelta(0)).toBe("±0.00");
    expect(formatDelta(-0.0035)).toBe("-0.004");
  });
});
