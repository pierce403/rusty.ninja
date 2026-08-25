import { describe, expect, it } from "vitest";
import { practicalReadingTemplates } from "../../src/challenges/reading";
import { getOfficialReferences } from "../../src/challenges/references";
import { validateChallenge } from "../../src/game/engine";
import { createRng } from "../../src/game/rng";

describe("practical code-reading challenges", () => {
  it("contains eight four-choice generators across a useful difficulty range", () => {
    expect(practicalReadingTemplates).toHaveLength(8);
    expect(Math.min(...practicalReadingTemplates.map((template) => template.minDifficulty)))
      .toBeLessThanOrEqual(0.35);
    expect(Math.max(...practicalReadingTemplates.map((template) => template.maxDifficulty)))
      .toBeGreaterThanOrEqual(5.25);

    const interactions = practicalReadingTemplates.map((template) =>
      template.generate(createRng(`format-${template.id}`), template.minDifficulty)
        .interactionType,
    );
    expect(interactions.filter((interaction) => interaction === "output-prediction"))
      .toHaveLength(5);
    expect(interactions.filter((interaction) => interaction === "code-comprehension"))
      .toHaveLength(3);
  });

  it("is deterministic, practical, and valid across generated variants", () => {
    for (const template of practicalReadingTemplates) {
      expect(template.track).toBe("code-reading");
      expect(getOfficialReferences(template.id).length).toBeGreaterThan(0);

      for (let sample = 0; sample < 20; sample += 1) {
        const fraction = sample / 19;
        const target = template.minDifficulty +
          (template.maxDifficulty - template.minDifficulty) * fraction;
        const seed = `reading-${template.id}-${sample}`;
        const first = template.generate(createRng(seed), target);
        const second = template.generate(createRng(seed), target);

        expect(first).toEqual(second);
        expect(first.track).toBe("code-reading");
        expect(first.findingClass).toBe("language-behavior");
        expect(["code-comprehension", "output-prediction"])
          .toContain(first.interactionType);
        expect(first.answers).toHaveLength(4);
        expect(new Set(first.answers.map((answer) => answer.id)).size).toBe(4);
        expect(new Set(first.answers.map((answer) => answer.label)).size).toBe(4);
        expect(first.answers.filter((answer) => answer.id === first.correctAnswer))
          .toHaveLength(1);
        expect(first.code.split("\n").length).toBeLessThanOrEqual(20);
        expect(validateChallenge(first, template), `${template.id} sample ${sample}`)
          .toEqual([]);
      }
    }
  });
});
