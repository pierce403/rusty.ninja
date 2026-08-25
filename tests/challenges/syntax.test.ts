import { describe, expect, it } from "vitest";
import { syntaxVocabularyTemplates } from "../../src/challenges/syntax";
import { challengeTemplates } from "../../src/challenges/registry";
import { ChallengeEngine, validateChallenge } from "../../src/game/engine";
import { createRng } from "../../src/game/rng";

describe("opening syntax and vocabulary track", () => {
  it("covers the notation needed before security review", () => {
    expect(syntaxVocabularyTemplates).toHaveLength(6);

    const concepts = new Set(
      syntaxVocabularyTemplates.flatMap((template) => [...template.concepts]),
    );
    expect([...concepts]).toEqual(expect.arrayContaining([
      "bindings",
      "shadowing",
      "references",
      "mutable-references",
      "slices",
      "lifetimes",
      "option-result",
      "question-mark",
    ]));
  });

  it("stays early, deterministic, and classified as language behavior", () => {
    for (const template of syntaxVocabularyTemplates) {
      expect(template.track).toBe("syntax-vocabulary");
      expect(template.minDifficulty).toBeLessThanOrEqual(1.15);
      expect(template.maxDifficulty).toBeLessThanOrEqual(2.35);

      for (let sample = 0; sample < 12; sample += 1) {
        const target = template.minDifficulty +
          (template.maxDifficulty - template.minDifficulty) * (sample / 11);
        const seed = `syntax-${template.id}-${sample}`;
        const first = template.generate(createRng(seed), target);
        const replay = template.generate(createRng(seed), target);

        expect(replay).toEqual(first);
        expect(first.track).toBe("syntax-vocabulary");
        expect(first.findingClass).toBe("language-behavior");
        expect(validateChallenge(first, template)).toEqual([]);
      }
    }
  });

  it("does not change pre-R1 short share links", () => {
    const legacyTemplates = challengeTemplates.filter(
      (template) => template.track === undefined,
    );
    const current = new ChallengeEngine(challengeTemplates);
    const legacy = new ChallengeEngine(legacyTemplates);

    for (const seed of ["7F3A91", "CAFE4030", "AUDIT007"]) {
      expect(current.fromSeed(seed)).toEqual(legacy.fromSeed(seed));
    }
  });
});
