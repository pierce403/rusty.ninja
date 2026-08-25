import { describe, expect, it } from "vitest";
import { challengeTemplates } from "../../src/challenges/registry";
import {
  ChallengeEngine,
  encodeChallengeSeed,
  validateChallenge,
} from "../../src/game/engine";
import { createRng } from "../../src/game/rng";

describe("challenge generator registry", () => {
  it("has unique template IDs and covers every interaction format", () => {
    expect(new Set(challengeTemplates.map((template) => template.id)).size)
      .toBe(challengeTemplates.length);

    const interactions = new Set<string>();
    for (const template of challengeTemplates) {
      const target = (template.minDifficulty + template.maxDifficulty) / 2;
      interactions.add(template.generate(createRng(`coverage-${template.id}`), target).interactionType);
    }

    expect(interactions).toEqual(new Set([
      "multiple-choice",
      "safety-classification",
      "dangerous-line",
      "patch-selection",
      "breaking-input",
      "find-all",
      "severity-classification",
      "inspect-next",
    ]));
  });

  it("is deterministic and satisfies invariants across randomized branches", () => {
    for (const template of challengeTemplates) {
      for (let sample = 0; sample < 24; sample += 1) {
        const fraction = sample / 23;
        const target = template.minDifficulty +
          (template.maxDifficulty - template.minDifficulty) * fraction;
        const seed = `audit-${template.id}-${sample}`;
        const first = template.generate(createRng(seed), target);
        const second = template.generate(createRng(seed), target);

        expect(first).toEqual(second);
        expect(validateChallenge(first, template), `${template.id} sample ${sample}`)
          .toEqual([]);
        expect(first.difficulty).toBeGreaterThanOrEqual(template.minDifficulty);
        expect(first.difficulty).toBeLessThanOrEqual(template.maxDifficulty);
        expect(new Set(first.answers.map((answer) => answer.id)).size)
          .toBe(first.answers.length);
      }
    }
  });

  it("reproduces canonical shared challenges exactly", () => {
    const engine = new ChallengeEngine(challengeTemplates);

    for (const template of challengeTemplates) {
      const target = (template.minDifficulty + template.maxDifficulty) / 2;
      const seed = encodeChallengeSeed(target, template.id, "C0FFEE12");
      expect(engine.fromSeed(seed)).toEqual(engine.fromSeed(seed));
    }
  });
});
