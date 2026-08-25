import { describe, expect, it } from "vitest";
import {
  MAX_CONCEPT_RESULTS,
  MAX_IMPORT_BYTES,
  MAX_RECENT_RESULTS,
  MAX_RECENT_SEEDS,
  PLAYER_STATE_STORAGE_KEY,
  createInitialPlayerState,
  exportPlayerState,
  getAccuracy,
  hasGradedChallenge,
  getWeakConcepts,
  importPlayerState,
  loadPlayerState,
  migratePlayerState,
  recordChallengeResult,
  resetPlayerState,
  savePlayerState,
  setCurrentChallenge,
  setCurrentChallengeSession,
  type StorageLike,
} from "../../src/game/player-state";
import { GRADED_SEED_FILTER_BYTE_COUNT } from "../../src/game/graded-seeds";
import type { Challenge } from "../../src/game/types";

class MemoryStorage implements StorageLike {
  readonly #items = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.#items.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.#items.set(key, value);
  }

  public removeItem(key: string): void {
    this.#items.delete(key);
  }
}

function challenge(
  seed: string,
  difficulty = 4,
  concepts: readonly string[] = ["integer-casts"],
): Challenge {
  return {
    seed,
    templateId: "integer-truncation",
    difficulty,
    concepts,
    title: "A narrowing cast",
    code: "let len = input as u16;",
    question: "What is the issue?",
    interactionType: "multiple-choice",
    answers: [
      { id: "truncates", label: "The value can truncate" },
      { id: "fine", label: "There is no issue" },
    ],
    correctAnswer: "truncates",
    explanation: "`as` can silently truncate.",
    impact: "A validation/allocation mismatch may follow.",
    auditorTakeaway: "Treat narrowing casts as trust boundaries.",
    findingClass: "security",
  };
}

describe("player state", () => {
  it("round-trips the exact ungraded UI session through storage", () => {
    const storage = new MemoryStorage();
    const state = setCurrentChallengeSession(
      setCurrentChallenge(createInitialPlayerState(), "7F3A91"),
      {
        seed: "7F3A91",
        confidence: "certain",
        selectedAnswerIds: ["panic", "truncation"],
        feedback: null,
      },
    );
    expect(savePlayerState(state, storage)).toBe(true);
    expect(loadPlayerState(storage)).toEqual(state);
    expect(storage.getItem(PLAYER_STATE_STORAGE_KEY)).not.toBeNull();
  });

  it("round-trips graded feedback, replay status, selections, and delta", () => {
    const state = setCurrentChallengeSession(
      setCurrentChallenge(createInitialPlayerState(), "FEEDBACK1"),
      {
        seed: "FEEDBACK1",
        confidence: "guess",
        selectedAnswerIds: ["fine"],
        feedback: {
          grade: {
            correct: false,
            selectedAnswerIds: ["fine"],
            correctAnswerIds: ["truncates"],
          },
          ratingDelta: -0.137,
          replay: true,
        },
      },
    );
    expect(importPlayerState(exportPlayerState(state))).toEqual(state);
  });

  it("migrates and sanitizes the v1 schema", () => {
    const migrated = migratePlayerState({
      version: 1,
      rating: 12,
      uncertainty: 99,
      streak: 3,
      totalAnswered: 4,
      correctAnswered: 8,
      calibration: 2,
      statsByConcept: {},
      recentSeeds: ["old-seed"],
      rustyState: 100,
    });
    expect(migrated).toMatchObject({
      version: 3,
      rating: 10,
      correctAnswered: 4,
      calibration: 1,
      currentSeed: null,
      currentSession: null,
      rustyState: 10,
    });
    expect(migrated.recentResults).toEqual([]);
    expect(hasGradedChallenge(migrated, "old-seed")).toBe(true);
  });

  it("migrates a v2 active seed into a resumable default session and replay filter", () => {
    const legacy = JSON.parse(exportPlayerState(createInitialPlayerState())) as Record<string, unknown>;
    legacy.version = 2;
    legacy.currentSeed = "ACTIVE-V2";
    legacy.recentSeeds = ["GRADED-V2"];
    delete legacy.currentSession;
    delete legacy.gradedSeedFilter;

    const migrated = migratePlayerState(legacy);
    expect(migrated.currentSession).toEqual({
      seed: "ACTIVE-V2",
      confidence: "pretty-sure",
      selectedAnswerIds: [],
      feedback: null,
    });
    expect(hasGradedChallenge(migrated, "GRADED-V2")).toBe(true);
  });

  it("exports, imports, and rejects unsupported or malformed progress", () => {
    const state = recordChallengeResult(createInitialPlayerState(), challenge("A001"), {
      correct: true,
      confidence: "certain",
    });
    expect(importPlayerState(exportPlayerState(state))).toEqual(state);
    expect(() => importPlayerState("not JSON")).toThrow("not valid JSON");
    expect(() => importPlayerState('{"version":99}')).toThrow("Unsupported");
    expect(() => importPlayerState('{"version":2}')).toThrow(
      "Progress file is incomplete",
    );
    expect(() => importPlayerState(" ".repeat(MAX_IMPORT_BYTES + 1))).toThrow(
      "Progress file is too large",
    );
  });

  it("keeps local loading tolerant while strict imports reject incomplete exports", () => {
    const storage = new MemoryStorage();
    storage.setItem(PLAYER_STATE_STORAGE_KEY, '{"version":2}');
    expect(loadPlayerState(storage)).toMatchObject({
      version: 3,
      rating: 0,
      currentSeed: null,
    });
  });

  it("resets persisted progress", () => {
    const storage = new MemoryStorage();
    savePlayerState(setCurrentChallenge(createInitialPlayerState(), "A001"), storage);
    expect(resetPlayerState(storage)).toEqual(createInitialPlayerState());
    expect(loadPlayerState(storage)).toEqual(createInitialPlayerState());
  });

  it("updates aggregate, concept, confidence, and hardest-challenge stats", () => {
    let state = createInitialPlayerState();
    state = recordChallengeResult(
      state,
      challenge("A001", 3, ["ownership"]),
      { correct: true, confidence: "certain" },
    );
    state = recordChallengeResult(
      state,
      challenge("A002", 8, ["unsafe-invariants"]),
      { correct: false, confidence: "certain" },
    );
    state = recordChallengeResult(
      state,
      challenge("A003", 7, ["unsafe-invariants"]),
      { correct: true, confidence: "guess" },
    );

    expect(state).toMatchObject({
      totalAnswered: 3,
      correctAnswered: 2,
      streak: 1,
      calibrationSamples: 3,
      currentSeed: null,
    });
    expect(getAccuracy(state)).toBeCloseTo(2 / 3);
    expect(state.statsByConcept["unsafe-invariants"]).toMatchObject({
      attempted: 2,
      correct: 1,
      streak: 1,
      lastDifficulty: 7,
    });
    expect(state.hardestCorrectChallenge?.seed).toBe("A003");
    expect(getWeakConcepts(state)).toContain("unsafe-invariants");
    expect(state.calibration).toBeGreaterThanOrEqual(0);
    expect(state.calibration).toBeLessThanOrEqual(1);
  });

  it("caps all histories", () => {
    let state = createInitialPlayerState();
    for (let index = 0; index < 100; index += 1) {
      state = recordChallengeResult(
        state,
        challenge(`S${String(index).padStart(3, "0")}`),
        { correct: index % 2 === 0 },
      );
    }
    expect(state.recentSeeds).toHaveLength(MAX_RECENT_SEEDS);
    expect(state.recentResults).toHaveLength(MAX_RECENT_RESULTS);
    expect(state.statsByConcept["integer-casts"]?.recentResults).toHaveLength(
      MAX_CONCEPT_RESULTS,
    );
    expect(state.recentSeeds.at(0)).toBe("S036");
  });

  it("never makes an old graded seed rateable when recent history rolls over", () => {
    let state = createInitialPlayerState();
    for (let index = 0; index < 100; index += 1) {
      state = recordChallengeResult(
        state,
        challenge(`OLD${String(index).padStart(3, "0")}`),
        { correct: true },
      );
    }

    expect(state.recentSeeds).not.toContain("OLD000");
    expect(hasGradedChallenge(state, "OLD000")).toBe(true);
    const beforeReplay = state;
    state = recordChallengeResult(state, challenge("OLD000"), { correct: false });
    expect(state).toBe(beforeReplay);
    expect(state.totalAnswered).toBe(100);
  });

  it("keeps durable replay storage at a fixed bounded size", () => {
    let state = createInitialPlayerState();
    for (let index = 0; index < 512; index += 1) {
      state = recordChallengeResult(
        state,
        challenge(`B${String(index).padStart(5, "0")}`),
        { correct: index % 2 === 0 },
      );
    }
    for (let index = 0; index < 512; index += 1) {
      expect(hasGradedChallenge(state, `B${String(index).padStart(5, "0")}`)).toBe(true);
    }
    expect(atob(state.gradedSeedFilter.bits)).toHaveLength(
      GRADED_SEED_FILTER_BYTE_COUNT,
    );
  });
});
