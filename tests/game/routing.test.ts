import { describe, expect, it } from "vitest";
import {
  buildChallengeHash,
  buildShareUrl,
  parseHashRoute,
} from "../../src/game/routing";

describe("hash routing", () => {
  it("parses home, utility, and challenge routes", () => {
    expect(parseHashRoute("")).toEqual({ kind: "home" });
    expect(parseHashRoute("#/stats")).toEqual({ kind: "stats" });
    expect(parseHashRoute("#/settings/")).toEqual({ kind: "settings" });
    expect(parseHashRoute("#/c/7F3A91")).toEqual({
      kind: "challenge",
      seed: "7F3A91",
    });
  });

  it("rejects malformed, oversized, and path-confusing seeds", () => {
    expect(parseHashRoute("#/c/a%2Fb").kind).toBe("not-found");
    expect(parseHashRoute("#/c/%ZZ").kind).toBe("not-found");
    expect(parseHashRoute(`#/c/${"A".repeat(129)}`).kind).toBe("not-found");
    expect(() => buildChallengeHash("a/b")).toThrow(TypeError);
  });

  it("builds a production share URL", () => {
    expect(buildChallengeHash("7F3A91")).toBe("#/c/7F3A91");
    expect(buildShareUrl("7F3A91")).toBe("https://rusty.ninja/#/c/7F3A91");
  });
});
