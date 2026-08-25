/** A player's displayed skill and a challenge's difficulty both use this 0–10 scale. */
export type SkillLevel = number;

export type FindingClass =
  | "language-behavior"
  | "compile-error"
  | "logic"
  | "panic-dos"
  | "security"
  | "context-dependent"
  | "unsoundness"
  | "undefined-behavior";

export type ChallengeTrack = "syntax-vocabulary";

export type SingleChoiceInteractionType =
  | "multiple-choice"
  | "safety-classification"
  | "dangerous-line"
  | "patch-selection"
  | "breaking-input"
  | "severity-classification"
  | "inspect-next";

export type MultiSelectInteractionType = "find-all";

export type ChallengeInteractionType =
  | SingleChoiceInteractionType
  | MultiSelectInteractionType;

export interface Answer {
  /** Stable within this generated challenge. Never use the display label as an ID. */
  readonly id: string;
  readonly label: string;
  /** Optional answer-specific teaching shown after the challenge is graded. */
  readonly explanation?: string;
}

interface ChallengeBase {
  /** A stable, shareable seed. The same application version must reproduce this challenge. */
  readonly seed: string;
  readonly templateId: string;
  readonly difficulty: SkillLevel;
  readonly concepts: readonly string[];
  /** Optional curriculum lane used for lightweight in-game orientation. */
  readonly track?: ChallengeTrack;
  readonly title: string;
  readonly code: string;
  readonly question: string;
  readonly answers: readonly Answer[];
  readonly explanation: string;
  readonly impact: string;
  readonly fixedCode?: string;
  readonly auditorTakeaway: string;
  readonly findingClass: FindingClass;
}

export interface SingleChoiceChallenge extends ChallengeBase {
  readonly interactionType: SingleChoiceInteractionType;
  readonly correctAnswer: string;
}

export interface MultiSelectChallenge extends ChallengeBase {
  readonly interactionType: MultiSelectInteractionType;
  readonly correctAnswer: readonly string[];
}

export type Challenge = SingleChoiceChallenge | MultiSelectChallenge;

/**
 * The deliberately small random interface available to challenge templates.
 * Every method is deterministic, including `fork`.
 */
export interface RNG {
  readonly seed: string;
  /** A value in [0, 1). */
  next(): number;
  /** A floating-point value in [min, max). */
  float(min?: number, max?: number): number;
  /** An integer in the inclusive range [min, max]. */
  int(min: number, max: number): number;
  bool(probability?: number): boolean;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  weightedPick<T>(items: readonly T[], weights: readonly number[]): T;
  /** An independent deterministic stream whose seed includes this stream's seed. */
  fork(namespace: string): RNG;
}

export interface ChallengeTemplate {
  /** Stable lowercase identifier. Changing it breaks old share links. */
  readonly id: string;
  readonly concepts: readonly string[];
  readonly track?: ChallengeTrack;
  readonly minDifficulty: SkillLevel;
  readonly maxDifficulty: SkillLevel;
  readonly generate: (rng: RNG, targetDifficulty: SkillLevel) => Challenge;
}

export type AnswerSubmission = string | readonly string[];

export interface GradeResult {
  readonly correct: boolean;
  readonly selectedAnswerIds: readonly string[];
  readonly correctAnswerIds: readonly string[];
}

export type AnswerConfidence = "guess" | "pretty-sure" | "certain";

export interface ConceptStats {
  readonly attempted: number;
  readonly correct: number;
  readonly streak: number;
  readonly proficiency: SkillLevel;
  readonly uncertainty: number;
  readonly lastDifficulty: SkillLevel;
  readonly recentResults: readonly boolean[];
}

export interface RecentChallengeResult {
  readonly seed: string;
  readonly templateId: string;
  readonly difficulty: SkillLevel;
  readonly concepts: readonly string[];
  readonly correct: boolean;
  readonly confidence: AnswerConfidence;
  readonly ratingDelta: number;
}

export interface HardestCorrectChallenge {
  readonly seed: string;
  readonly templateId: string;
  readonly title: string;
  readonly difficulty: SkillLevel;
}
