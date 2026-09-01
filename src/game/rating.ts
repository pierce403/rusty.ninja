import type { AnswerConfidence, RNG, SkillLevel } from "./types";

export const MIN_RATING = 0;
export const MAX_RATING = 10;
export const DEFAULT_UNCERTAINTY = 2.2;
export const MIN_UNCERTAINTY = 0.12;
export const MAX_UNCERTAINTY = 2.8;

const LOGISTIC_SCALE = 1.15;
const PRE_MASTERY_CEILING = 9.994;
// Keeps a calibrated difficulty-10 success near level 10 worth roughly 0.015.
const TOP_TIER_BOUNDARY_FLOOR = 0.125;

const CONFIDENCE_EVIDENCE: Readonly<Record<AnswerConfidence, number>> = {
  guess: 0.9,
  "pretty-sure": 1,
  certain: 1.04,
};

export interface RatingInput {
  readonly rating: SkillLevel;
  readonly uncertainty: number;
  readonly challengeDifficulty: SkillLevel;
  readonly correct: boolean;
  readonly confidence?: AnswerConfidence;
}
export interface RatingUpdate {
  readonly rating: SkillLevel;
  readonly uncertainty: number;
  readonly delta: number;
  readonly expectedProbability: number;
  readonly masteryAchieved: boolean;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function expectedSuccessProbability(
  rating: SkillLevel,
  challengeDifficulty: SkillLevel,
): number {
  const difference =
    (clamp(rating, MIN_RATING, MAX_RATING) -
      clamp(challengeDifficulty, MIN_RATING, MAX_RATING)) /
    LOGISTIC_SCALE;
  return 1 / (1 + Math.exp(-difference));
}

/**
 * Online bounded Elo/IRT-style update.
 *
 * Gains are compressed by remaining headroom while losses are not. Level 10 is
 * a separately gated mastery observation, rather than a value obtainable by
 * repeatedly grinding easier questions.
 */
export function updateRating(input: RatingInput): RatingUpdate {
  const oldRating = clamp(input.rating, MIN_RATING, MAX_RATING);
  const oldUncertainty = clamp(
    Number.isFinite(input.uncertainty) ? input.uncertainty : DEFAULT_UNCERTAINTY,
    MIN_UNCERTAINTY,
    MAX_UNCERTAINTY,
  );
  const difficulty = clamp(
    input.challengeDifficulty,
    MIN_RATING,
    MAX_RATING,
  );
  const confidence = input.confidence ?? "pretty-sure";
  const evidenceWeight = CONFIDENCE_EVIDENCE[confidence];
  const expectedProbability = expectedSuccessProbability(oldRating, difficulty);
  const observed = input.correct ? 1 : 0;
  const residual = observed - expectedProbability;

  const uncertaintyFactor = clamp(oldUncertainty / 1.4, 0.32, 1.6);
  const learningRate = 0.72 * uncertaintyFactor * evidenceWeight;
  const correctBoundaryFloor = difficulty >= 9.9
    ? TOP_TIER_BOUNDARY_FLOOR
    : 0.006;
  const boundaryFactor = input.correct
    ? Math.max(
        correctBoundaryFloor,
        ((MAX_RATING - oldRating) / MAX_RATING) ** 0.72,
      )
    : Math.max(0.07, (oldRating / MAX_RATING) ** 0.62);
  const unboundedDelta = learningRate * residual * boundaryFactor;

  const information = 4 * expectedProbability * (1 - expectedProbability);
  const shrinkage = 0.025 + 0.055 * information * evidenceWeight;
  const surprise = Math.abs(residual);
  const surpriseIncrease = surprise > 0.85 ? (surprise - 0.85) * 0.08 : 0;
  const uncertainty = clamp(
    oldUncertainty * (1 - shrinkage) + surpriseIncrease,
    MIN_UNCERTAINTY,
    MAX_UNCERTAINTY,
  );

  const masteryAchieved =
    input.correct &&
    confidence !== "guess" &&
    oldRating >= 9.97 &&
    difficulty >= 9.9 &&
    uncertainty <= 0.18;

  const rating = masteryAchieved
    ? MAX_RATING
    : clamp(
        oldRating + unboundedDelta,
        MIN_RATING,
        oldRating === MAX_RATING ? MAX_RATING : PRE_MASTERY_CEILING,
      );

  return {
    rating,
    uncertainty,
    delta: rating - oldRating,
    expectedProbability,
    masteryAchieved,
  };
}

/** Never round a pre-mastery value up to a misleading displayed 10.00. */
export function formatRating(rating: SkillLevel): string {
  if (rating >= MAX_RATING) {
    return "10.00";
  }
  return Math.min(clamp(rating, MIN_RATING, MAX_RATING), 9.994).toFixed(2);
}

/**
 * Sample mostly near the current estimate, with deliberate easier and harder
 * probes. Injecting an RNG keeps both tests and adaptive session seeds stable.
 */
export function sampleTargetDifficulty(
  rating: SkillLevel,
  uncertainty: number,
  rng: RNG,
): SkillLevel {
  const skill = clamp(rating, MIN_RATING, MAX_RATING);
  const spread = 0.42 + clamp(uncertainty, MIN_UNCERTAINTY, MAX_UNCERTAINTY) * 0.22;
  const exploration = rng.next();
  let target: number;

  if (exploration < 0.16) {
    target = skill - rng.float(0.55, 1.65);
  } else if (exploration > 0.82) {
    target = skill + rng.float(0.65, 1.85);
  } else {
    // Four uniforms approximate a compact normal distribution without hidden state.
    const centered =
      rng.next() + rng.next() + rng.next() + rng.next() - 2;
    target = skill + centered * spread;
  }

  return Math.round(clamp(target, MIN_RATING, MAX_RATING) * 100) / 100;
}
