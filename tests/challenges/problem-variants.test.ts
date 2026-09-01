import { describe, expect, it } from "vitest";
import { challengeTemplates } from "../../src/challenges/registry";
import {
  ChallengeEngine,
  encodeChallengeSeed,
  validateChallenge,
} from "../../src/game/engine";
import {
  PROBLEM_VARIANT_COUNT,
  REVIEW_CONTEXTS,
} from "../../src/game/problem-variants";

describe("expanded problem variants", () => {
  const engine = new ChallengeEngine(challengeTemplates);

  it("defines forty distinct review contexts", () => {
    expect(PROBLEM_VARIANT_COUNT).toBe(40);
    expect(new Set(REVIEW_CONTEXTS.map((context) => context.id)).size).toBe(40);
    expect(new Set(REVIEW_CONTEXTS.map((context) => context.label)).size).toBe(40);
    expect(new Set(REVIEW_CONTEXTS.map((context) => context.sourcePath)).size).toBe(40);
  });

  it("multiplies every semantic template into forty deterministic cases", () => {
    for (const template of challengeTemplates) {
      const target = (template.minDifficulty + template.maxDifficulty) / 2;
      const generated = Array.from({ length: PROBLEM_VARIANT_COUNT }, (_, index) =>
        engine.fromSeed(encodeChallengeSeed(target, template.id, "VARIANT40", index)),
      );

      expect(
        new Set(generated.map((challenge) => challenge.caseVariant?.id)).size,
        template.id,
      ).toBe(PROBLEM_VARIANT_COUNT);
      for (const challenge of generated) {
        expect(validateChallenge(challenge, template), template.id).toEqual([]);
        expect(engine.fromSeed(challenge.seed)).toEqual(challenge);
      }
    }
  });

  it("provides the forty-fold expansion across the full 0–10 scale", () => {
    for (let quarterLevel = 0; quarterLevel <= 40; quarterLevel += 1) {
      const level = quarterLevel / 4;
      const eligible = challengeTemplates.filter(
        (template) =>
          level >= template.minDifficulty && level <= template.maxDifficulty,
      );
      const expandedIds = eligible.flatMap((template) =>
        REVIEW_CONTEXTS.map((context) => `${template.id}:${context.id}`),
      );
      expect(eligible.length, `level ${level}`).toBeGreaterThan(0);
      expect(new Set(expandedIds).size, `level ${level}`).toBe(
        eligible.length * 40,
      );
      expect(expandedIds.length, `level ${level}`).toBeGreaterThanOrEqual(40);
    }
  });
});
