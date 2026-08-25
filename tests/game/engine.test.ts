import { describe, expect, it } from "vitest";
import {
  ChallengeEngine,
  ChallengeGenerationError,
  decodeChallengeSeed,
  encodeChallengeSeed,
  gradeChallenge,
  selectChallengeTemplate,
  validateChallenge,
} from "../../src/game/engine";
import {
  createInitialPlayerState,
  recordChallengeResult,
} from "../../src/game/player-state";
import type { Challenge, ChallengeTemplate } from "../../src/game/types";
import { createRng } from "../../src/game/rng";

function makeTemplate(
  id: string,
  minDifficulty = 0,
  maxDifficulty = 10,
  concepts: readonly string[] = [id],
): ChallengeTemplate {
  return {
    id,
    minDifficulty,
    maxDifficulty,
    concepts,
    generate(rng, targetDifficulty): Challenge {
      const width = rng.pick(["u16", "u32", "usize"]);
      const answers = rng.shuffle([
        { id: "checked", label: "Use a checked conversion" },
        { id: "cast", label: "Keep the cast" },
        { id: "wrap", label: "Use wrapping arithmetic" },
      ]);
      return {
        seed: rng.seed,
        templateId: id,
        difficulty: Math.min(maxDifficulty, Math.max(minDifficulty, targetDifficulty)),
        concepts,
        title: `Attacker-controlled ${width}`,
        code: `let length = supplied as ${width};`,
        question: "Which patch preserves the validation invariant?",
        interactionType: "patch-selection",
        answers,
        correctAnswer: "checked",
        explanation: "A checked conversion rejects values that do not fit.",
        impact: "Truncation can make validation disagree with later memory access.",
        fixedCode: `let length = ${width}::try_from(supplied)?;`,
        auditorTakeaway: "Treat representation changes as trust boundaries.",
        findingClass: "security",
      };
    },
  };
}

describe("challenge engine", () => {
  const broad = makeTemplate("broad-review");

  it("reproduces the exact challenge from the same seed", () => {
    const engine = new ChallengeEngine([broad]);
    const first = engine.fromSeed("7F3A91");
    const replay = engine.fromSeed("7F3A91");
    expect(replay).toEqual(first);
  });

  it("encodes template and difficulty in canonical share seeds", () => {
    const seed = encodeChallengeSeed(6.371, "broad-review", "7F3A91");
    expect(decodeChallengeSeed(seed)).toEqual({
      version: 1,
      targetDifficulty: 6.371,
      templateId: "broad-review",
      entropy: "7F3A91",
    });
    const engine = new ChallengeEngine([broad]);
    expect(engine.fromSeed(seed)).toMatchObject({
      seed,
      templateId: "broad-review",
      difficulty: 6.371,
    });
    expect(
      decodeChallengeSeed(
        encodeChallengeSeed(8.5, "soundness.safe-wrapper.v1", "CAFE4030"),
      )?.templateId,
    ).toBe("soundness.safe-wrapper.v1");
  });

  it("keeps canonical links stable when registry order changes", () => {
    const beginner = makeTemplate("beginner", 0, 4);
    const advanced = makeTemplate("advanced", 7, 10);
    const seed = encodeChallengeSeed(9, "advanced", "FACE4030");
    const first = new ChallengeEngine([beginner, advanced]).fromSeed(seed);
    const reordered = new ChallengeEngine([advanced, beginner]).fromSeed(seed);
    expect(reordered).toEqual(first);
  });

  it("adapts average generated difficulty toward player skill", () => {
    let lowCounter = 0;
    let highCounter = 0;
    const lowEngine = new ChallengeEngine([broad], {
      seedFactory: () => `LOW${String(lowCounter++).padStart(5, "0")}`,
    });
    const highEngine = new ChallengeEngine([broad], {
      seedFactory: () => `HIGH${String(highCounter++).padStart(5, "0")}`,
    });
    const lowState = { ...createInitialPlayerState(), rating: 2, uncertainty: 0.8 };
    const highState = { ...createInitialPlayerState(), rating: 8, uncertainty: 0.8 };
    const average = (values: readonly number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;
    const low = Array.from({ length: 80 }, () => lowEngine.next(lowState).difficulty);
    const high = Array.from({ length: 80 }, () => highEngine.next(highState).difficulty);
    expect(average(high) - average(low)).toBeGreaterThan(5);
    expect([...low, ...high].every((difficulty) => difficulty >= 0 && difficulty <= 10)).toBe(true);
  });

  it("preferentially samples the syntax track during the opening", () => {
    const syntaxTemplate = {
      ...makeTemplate("syntax-track", 0, 3),
      track: "syntax-vocabulary" as const,
    };
    const auditTemplate = makeTemplate("audit-track", 0, 3);
    const initial = createInitialPlayerState();
    const experienced = { ...initial, totalAnswered: 18 };
    const sample = (state: typeof initial) => Array.from(
      { length: 240 },
      (_, index) => selectChallengeTemplate(
        [syntaxTemplate, auditTemplate],
        1.5,
        createRng(`track-selection-${index}`),
        state,
      ).id,
    ).filter((id) => id === syntaxTemplate.id).length;

    expect(sample(initial)).toBeGreaterThan(sample(experienced) + 30);
  });

  it("does not regenerate an already graded seed after recent history rollover", () => {
    const engine = new ChallengeEngine([broad], {
      seedFactory: () => "REPLAY00",
    });
    const first = engine.next(createInitialPlayerState());
    const graded = recordChallengeResult(createInitialPlayerState(), first, {
      correct: true,
    });
    const next = engine.next({ ...graded, recentSeeds: [] });
    expect(next.seed).not.toBe(first.seed);
  });

  it("validates generator invariants over many deterministic seeds", () => {
    const engine = new ChallengeEngine([broad]);
    for (let index = 0; index < 200; index += 1) {
      const generated = engine.fromSeed(`SEED${String(index).padStart(4, "0")}`);
      expect(validateChallenge(generated, broad)).toEqual([]);
      expect(new Set(generated.answers.map((answer) => answer.id)).size).toBe(
        generated.answers.length,
      );
      expect(typeof generated.correctAnswer).toBe("string");
      expect(
        generated.answers.filter((answer) => answer.id === generated.correctAnswer),
      ).toHaveLength(1);
    }
  });

  it("rejects duplicate answer IDs and broken correct-answer references", () => {
    const generated = new ChallengeEngine([broad]).fromSeed("BAD1000");
    if (generated.interactionType === "find-all") {
      throw new Error("The single-choice fixture generated an unexpected interaction");
    }
    const invalid = {
      ...generated,
      answers: [
        { id: "same", label: "First" },
        { id: "same", label: "Second" },
      ],
      correctAnswer: "missing",
    } satisfies Challenge;
    expect(validateChallenge(invalid)).toEqual(
      expect.arrayContaining([
        "answer IDs must be unique",
        "every correct answer ID must refer to an answer",
      ]),
    );
  });

  it("grades single-choice and exact-set multi-select answers", () => {
    const single = new ChallengeEngine([broad]).fromSeed("GRADE001");
    expect(gradeChallenge(single, "checked").correct).toBe(true);
    expect(gradeChallenge(single, "cast").correct).toBe(false);

    const multiple: Challenge = {
      ...single,
      interactionType: "find-all",
      answers: [
        { id: "panic", label: "Reachable panic" },
        { id: "truncation", label: "Narrowing cast" },
        { id: "syntax", label: "Syntax error" },
      ],
      correctAnswer: ["panic", "truncation"],
    };
    expect(gradeChallenge(multiple, ["truncation", "panic"]).correct).toBe(true);
    expect(gradeChallenge(multiple, ["panic"]).correct).toBe(false);
    expect(gradeChallenge(multiple, ["panic", "syntax"]).correct).toBe(false);
  });

  it("fails closed for invalid registries and unavailable canonical templates", () => {
    expect(() => new ChallengeEngine([])).toThrow(ChallengeGenerationError);
    expect(() => new ChallengeEngine([broad, broad])).toThrow(
      ChallengeGenerationError,
    );
    const engine = new ChallengeEngine([broad]);
    expect(() =>
      engine.fromSeed(encodeChallengeSeed(5, "removed-template", "DEAD4030")),
    ).toThrow("unavailable");
  });
});
