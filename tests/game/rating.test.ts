import { describe, expect, it } from "vitest";
import {
  formatRating,
  sampleTargetDifficulty,
  updateRating,
} from "../../src/game/rating";
import { createRng } from "../../src/game/rng";

describe("adaptive rating", () => {
  it("rewards hard successes more than easy successes", () => {
    const common = { rating: 5, uncertainty: 1.2, correct: true } as const;
    const hard = updateRating({ ...common, challengeDifficulty: 8 });
    const easy = updateRating({ ...common, challengeDifficulty: 2 });
    expect(hard.delta).toBeGreaterThan(easy.delta);
  });

  it("penalizes an easy miss more than an extremely hard miss", () => {
    const common = { rating: 6, uncertainty: 1.2, correct: false } as const;
    const easy = updateRating({ ...common, challengeDifficulty: 2 });
    const hard = updateRating({ ...common, challengeDifficulty: 10 });
    expect(easy.delta).toBeLessThan(hard.delta);
    expect(easy.delta).toBeLessThan(0);
  });

  it("materially slows gains close to level 10", () => {
    const middle = updateRating({
      rating: 5,
      uncertainty: 0.8,
      challengeDifficulty: 5,
      correct: true,
    });
    const elite = updateRating({
      rating: 9.8,
      uncertainty: 0.8,
      challengeDifficulty: 9.8,
      correct: true,
    });
    expect(elite.delta).toBeLessThan(middle.delta * 0.15);
  });

  it("does not award exact level 10 through easy-question grinding", () => {
    let rating = 9.8;
    let uncertainty = 0.3;
    for (let index = 0; index < 2_000; index += 1) {
      const update = updateRating({
        rating,
        uncertainty,
        challengeDifficulty: 2,
        correct: true,
        confidence: "certain",
      });
      rating = update.rating;
      uncertainty = update.uncertainty;
    }
    expect(rating).toBeLessThan(10);
    expect(rating).toBeLessThan(9.9);
    expect(formatRating(rating)).not.toBe("10.00");
  });

  it("reserves exact 10 for a calibrated top-level mastery observation", () => {
    const almost = updateRating({
      rating: 9.98,
      uncertainty: 0.17,
      challengeDifficulty: 9.95,
      correct: true,
      confidence: "pretty-sure",
    });
    const mastery = updateRating({
      rating: 9.98,
      uncertainty: 0.17,
      challengeDifficulty: 9.95,
      correct: true,
      confidence: "certain",
    });
    expect(almost.rating).toBeLessThan(10);
    expect(mastery).toMatchObject({ rating: 10, masteryAchieved: true });
  });

  it("reduces uncertainty with informative answers", () => {
    const update = updateRating({
      rating: 4,
      uncertainty: 2.2,
      challengeDifficulty: 4,
      correct: true,
    });
    expect(update.uncertainty).toBeLessThan(2.2);
  });

  it("samples bounded recalibration challenges above and below the estimate", () => {
    const samples = Array.from({ length: 100 }, (_, index) =>
      sampleTargetDifficulty(5, 1, createRng(`probe-${index}`)),
    );
    expect(samples.every((value) => value >= 0 && value <= 10)).toBe(true);
    expect(samples.some((value) => value < 4.3)).toBe(true);
    expect(samples.some((value) => value > 5.7)).toBe(true);
  });
});
