import { updateRating, DEFAULT_UNCERTAINTY, MAX_UNCERTAINTY, MIN_UNCERTAINTY, clamp } from "./rating";
import type {
  AnswerConfidence,
  Challenge,
  ConceptStats,
  GradeResult,
  HardestCorrectChallenge,
  RecentChallengeResult,
} from "./types";
import { getRustyStage, type RustyStageLevel } from "../rusty/progression";
import {
  addGradedSeed,
  hasGradedSeed,
  isValidGradedSeedFilter,
  sanitizeGradedSeedFilter,
  type GradedSeedFilter,
} from "./graded-seeds";

export const PLAYER_STATE_STORAGE_KEY = "rusty.ninja:player-state";
export const CURRENT_PLAYER_STATE_VERSION = 3;
export const MAX_RECENT_SEEDS = 64;
export const MAX_RECENT_RESULTS = 40;
export const MAX_CONCEPT_RESULTS = 12;
const MAX_CONCEPTS = 128;
export const MAX_IMPORT_BYTES = 1_000_000;

export interface PlayerStateV1 {
  readonly version: 1;
  readonly rating: number;
  readonly uncertainty: number;
  readonly streak: number;
  readonly totalAnswered: number;
  readonly correctAnswered: number;
  readonly calibration: number;
  readonly statsByConcept: Readonly<Record<string, ConceptStats>>;
  readonly recentSeeds: readonly string[];
  readonly rustyState: number;
}
export interface PlayerStateV2 {
  readonly version: 2;
  readonly rating: number;
  readonly uncertainty: number;
  readonly streak: number;
  readonly totalAnswered: number;
  readonly correctAnswered: number;
  /** A 0–1 confidence-calibration score; 0 means no samples when samples is zero. */
  readonly calibration: number;
  readonly calibrationSamples: number;
  readonly statsByConcept: Readonly<Record<string, ConceptStats>>;
  readonly recentSeeds: readonly string[];
  readonly recentResults: readonly RecentChallengeResult[];
  readonly rustyState: RustyStageLevel;
  /** Lets a normal session resume the exact challenge after reload. */
  readonly currentSeed: string | null;
  readonly hardestCorrectChallenge: HardestCorrectChallenge | null;
}

export interface ChallengeSessionFeedback {
  readonly grade: GradeResult;
  readonly ratingDelta: number;
  readonly replay: boolean;
}

export interface ChallengeSession {
  readonly seed: string;
  readonly confidence: AnswerConfidence;
  readonly selectedAnswerIds: readonly string[];
  readonly feedback: ChallengeSessionFeedback | null;
}

export interface PlayerStateV3 {
  readonly version: 3;
  readonly rating: number;
  readonly uncertainty: number;
  readonly streak: number;
  readonly totalAnswered: number;
  readonly correctAnswered: number;
  readonly calibration: number;
  readonly calibrationSamples: number;
  readonly statsByConcept: Readonly<Record<string, ConceptStats>>;
  readonly recentSeeds: readonly string[];
  readonly recentResults: readonly RecentChallengeResult[];
  readonly rustyState: RustyStageLevel;
  /** Retained as a convenient and backward-compatible active-seed pointer. */
  readonly currentSeed: string | null;
  /** Exact, bounded UI state for resuming an answer or graded explanation. */
  readonly currentSession: ChallengeSession | null;
  readonly hardestCorrectChallenge: HardestCorrectChallenge | null;
  /** Durable, fixed-size replay protection; unlike recentSeeds it never rolls over. */
  readonly gradedSeedFilter: GradedSeedFilter;
}

export type PlayerState = PlayerStateV3;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class PlayerStateImportError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PlayerStateImportError";
  }
}

export function createInitialPlayerState(): PlayerState {
  return {
    version: CURRENT_PLAYER_STATE_VERSION,
    rating: 0,
    uncertainty: DEFAULT_UNCERTAINTY,
    streak: 0,
    totalAnswered: 0,
    correctAnswered: 0,
    calibration: 0,
    calibrationSamples: 0,
    statsByConcept: {},
    recentSeeds: [],
    recentResults: [],
    rustyState: 0,
    currentSeed: null,
    currentSession: null,
    hardestCorrectChallenge: null,
    gradedSeedFilter: sanitizeGradedSeedFilter(null),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nonNegativeInteger(value: unknown, fallback = 0): number {
  return Math.max(0, Math.floor(finiteNumber(value, fallback)));
}

function safeString(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength
    ? value
    : null;
}

function sanitizeConfidence(value: unknown): AnswerConfidence {
  return value === "guess" || value === "certain" || value === "pretty-sure"
    ? value
    : "pretty-sure";
}

function sanitizeAnswerIds(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .map((id) => safeString(id, 80))
      .filter((id): id is string => id !== null),
  )].slice(0, 64);
}

function sanitizeGradeResult(value: unknown): GradeResult | null {
  if (!isRecord(value)) return null;
  const selectedAnswerIds = sanitizeAnswerIds(value.selectedAnswerIds);
  const correctAnswerIds = sanitizeAnswerIds(value.correctAnswerIds);
  if (correctAnswerIds.length === 0) return null;
  return {
    correct: value.correct === true,
    selectedAnswerIds,
    correctAnswerIds,
  };
}

function sanitizeSessionFeedback(value: unknown): ChallengeSessionFeedback | null {
  if (!isRecord(value)) return null;
  const grade = sanitizeGradeResult(value.grade);
  if (!grade) return null;
  return {
    grade,
    ratingDelta: clamp(finiteNumber(value.ratingDelta, 0), -10, 10),
    replay: value.replay === true,
  };
}

function sanitizeChallengeSession(
  value: unknown,
  fallbackSeed: string | null,
): ChallengeSession | null {
  const record = isRecord(value) ? value : null;
  const seed = safeString(record?.seed, 128) ?? fallbackSeed;
  if (!seed) return null;
  const feedback = sanitizeSessionFeedback(record?.feedback);
  const selectedAnswerIds = feedback
    ? feedback.grade.selectedAnswerIds
    : sanitizeAnswerIds(record?.selectedAnswerIds);
  return {
    seed,
    confidence: sanitizeConfidence(record?.confidence),
    selectedAnswerIds,
    feedback,
  };
}

function sanitizeConceptStats(value: unknown, fallbackRating: number): ConceptStats {
  const record = isRecord(value) ? value : {};
  const attempted = nonNegativeInteger(record.attempted);
  const correct = Math.min(attempted, nonNegativeInteger(record.correct));
  const recentResults = Array.isArray(record.recentResults)
    ? record.recentResults
        .filter((result): result is boolean => typeof result === "boolean")
        .slice(-MAX_CONCEPT_RESULTS)
    : [];

  return {
    attempted,
    correct,
    streak: Math.min(attempted, nonNegativeInteger(record.streak)),
    proficiency: clamp(finiteNumber(record.proficiency, fallbackRating), 0, 10),
    uncertainty: clamp(
      finiteNumber(record.uncertainty, DEFAULT_UNCERTAINTY),
      MIN_UNCERTAINTY,
      MAX_UNCERTAINTY,
    ),
    lastDifficulty: clamp(finiteNumber(record.lastDifficulty, fallbackRating), 0, 10),
    recentResults,
  };
}

function sanitizeStatsByConcept(
  value: unknown,
  fallbackRating: number,
): Readonly<Record<string, ConceptStats>> {
  if (!isRecord(value)) {
    return {};
  }

  const entries = Object.entries(value)
    .filter(([concept]) => concept.length > 0 && concept.length <= 80)
    .slice(0, MAX_CONCEPTS)
    .map(([concept, stats]) => [
      concept,
      sanitizeConceptStats(stats, fallbackRating),
    ] as const);
  return Object.fromEntries(entries);
}

function sanitizeRecentResults(value: unknown): readonly RecentChallengeResult[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const results: RecentChallengeResult[] = [];
  for (const candidate of value.slice(-MAX_RECENT_RESULTS)) {
    if (!isRecord(candidate)) continue;
    const seed = safeString(candidate.seed, 128);
    const templateId = safeString(candidate.templateId, 80);
    if (!seed || !templateId) continue;
    const confidence = sanitizeConfidence(candidate.confidence);
    const concepts = Array.isArray(candidate.concepts)
      ? candidate.concepts
          .map((concept) => safeString(concept, 80))
          .filter((concept): concept is string => concept !== null)
          .slice(0, 16)
      : [];

    results.push({
      seed,
      templateId,
      difficulty: clamp(finiteNumber(candidate.difficulty, 0), 0, 10),
      concepts,
      correct: candidate.correct === true,
      confidence,
      ratingDelta: clamp(finiteNumber(candidate.ratingDelta, 0), -10, 10),
    });
  }
  return results;
}

function sanitizeHardestCorrect(value: unknown): HardestCorrectChallenge | null {
  if (!isRecord(value)) return null;
  const seed = safeString(value.seed, 128);
  const templateId = safeString(value.templateId, 80);
  const title = safeString(value.title, 200);
  if (!seed || !templateId || !title) return null;
  return {
    seed,
    templateId,
    title,
    difficulty: clamp(finiteNumber(value.difficulty, 0), 0, 10),
  };
}

function sanitizeCommon(value: Record<string, unknown>): PlayerState {
  const rating = clamp(finiteNumber(value.rating, 0), 0, 10);
  const totalAnswered = nonNegativeInteger(value.totalAnswered);
  const correctAnswered = Math.min(
    totalAnswered,
    nonNegativeInteger(value.correctAnswered),
  );
  const recentSeeds = Array.isArray(value.recentSeeds)
    ? value.recentSeeds
        .map((seed) => safeString(seed, 128))
        .filter((seed): seed is string => seed !== null)
        .slice(-MAX_RECENT_SEEDS)
    : [];
  const currentSeed = value.currentSeed === null
    ? null
    : safeString(value.currentSeed, 128);
  const currentSession = sanitizeChallengeSession(value.currentSession, currentSeed);
  const activeSeed = currentSession?.seed ?? currentSeed;

  return {
    version: CURRENT_PLAYER_STATE_VERSION,
    rating,
    uncertainty: clamp(
      finiteNumber(value.uncertainty, DEFAULT_UNCERTAINTY),
      MIN_UNCERTAINTY,
      MAX_UNCERTAINTY,
    ),
    streak: Math.min(totalAnswered, nonNegativeInteger(value.streak)),
    totalAnswered,
    correctAnswered,
    calibration: clamp(finiteNumber(value.calibration, 0), 0, 1),
    calibrationSamples: Math.min(
      totalAnswered,
      nonNegativeInteger(value.calibrationSamples, totalAnswered),
    ),
    statsByConcept: sanitizeStatsByConcept(value.statsByConcept, rating),
    recentSeeds,
    recentResults: sanitizeRecentResults(value.recentResults),
    rustyState: getRustyStage(rating).level,
    currentSeed: activeSeed,
    currentSession,
    hardestCorrectChallenge: sanitizeHardestCorrect(value.hardestCorrectChallenge),
    gradedSeedFilter: sanitizeGradedSeedFilter(value.gradedSeedFilter, recentSeeds),
  };
}

export function migratePlayerState(value: unknown): PlayerState {
  if (!isRecord(value)) {
    throw new PlayerStateImportError("Progress must be a JSON object");
  }

  if (value.version === 1) {
    return sanitizeCommon({
      ...value,
      calibrationSamples: finiteNumber(value.totalAnswered, 0),
      recentResults: [],
      currentSeed: null,
      currentSession: null,
      hardestCorrectChallenge: null,
      gradedSeedFilter: null,
    });
  }

  if (value.version === 2) {
    return sanitizeCommon({
      ...value,
      currentSession: null,
      gradedSeedFilter: null,
    });
  }

  if (value.version === CURRENT_PLAYER_STATE_VERSION) {
    return sanitizeCommon(value);
  }

  throw new PlayerStateImportError(`Unsupported progress version: ${String(value.version)}`);
}

function defaultStorage(): StorageLike | null {
  try {
    return (globalThis as typeof globalThis & { localStorage?: StorageLike })
      .localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadPlayerState(storage: StorageLike | null = defaultStorage()): PlayerState {
  if (!storage) return createInitialPlayerState();

  try {
    const serialized = storage.getItem(PLAYER_STATE_STORAGE_KEY);
    if (!serialized) return createInitialPlayerState();
    return migratePlayerState(JSON.parse(serialized) as unknown);
  } catch {
    return createInitialPlayerState();
  }
}

export function savePlayerState(
  state: PlayerState,
  storage: StorageLike | null = defaultStorage(),
): boolean {
  if (!storage) return false;

  try {
    const sanitized = migratePlayerState(state);
    storage.setItem(PLAYER_STATE_STORAGE_KEY, JSON.stringify(sanitized));
    return true;
  } catch {
    return false;
  }
}

export function resetPlayerState(
  storage: StorageLike | null = defaultStorage(),
): PlayerState {
  try {
    storage?.removeItem(PLAYER_STATE_STORAGE_KEY);
  } catch {
    // Returning a fresh in-memory state still lets the game reset for this session.
  }
  return createInitialPlayerState();
}

export function exportPlayerState(state: PlayerState): string {
  return JSON.stringify(migratePlayerState(state), null, 2);
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function assertCompleteImportedState(value: unknown): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new PlayerStateImportError("Progress must be a JSON object");
  }
  if (value.version !== 1 && value.version !== 2 && value.version !== 3) {
    throw new PlayerStateImportError(`Unsupported progress version: ${String(value.version)}`);
  }

  const commonFields = [
    "version",
    "rating",
    "uncertainty",
    "streak",
    "totalAnswered",
    "correctAnswered",
    "calibration",
    "statsByConcept",
    "recentSeeds",
    "rustyState",
  ];
  const v2Fields = [
    "calibrationSamples",
    "recentResults",
    "currentSeed",
    "hardestCorrectChallenge",
  ];
  const v3Fields = ["currentSession", "gradedSeedFilter"];
  const requiredFields = [
    ...commonFields,
    ...(value.version >= 2 ? v2Fields : []),
    ...(value.version >= 3 ? v3Fields : []),
  ];
  const missing = requiredFields.find((field) => !hasOwn(value, field));
  if (missing) {
    throw new PlayerStateImportError(`Progress file is incomplete: missing ${missing}`);
  }

  const numberFields = [
    "rating",
    "uncertainty",
    "streak",
    "totalAnswered",
    "correctAnswered",
    "calibration",
    "rustyState",
    ...(value.version >= 2 ? ["calibrationSamples"] : []),
  ];
  if (numberFields.some((field) =>
    typeof value[field] !== "number" || !Number.isFinite(value[field]))) {
    throw new PlayerStateImportError("Progress file has invalid numeric fields");
  }
  if (!isRecord(value.statsByConcept) || !Array.isArray(value.recentSeeds)) {
    throw new PlayerStateImportError("Progress file has invalid history fields");
  }
  if (value.version >= 2 && !Array.isArray(value.recentResults)) {
    throw new PlayerStateImportError("Progress file has invalid recent results");
  }
  if (
    value.version >= 2 &&
    value.currentSeed !== null &&
    typeof value.currentSeed !== "string"
  ) {
    throw new PlayerStateImportError("Progress file has an invalid current seed");
  }
  if (
    value.version === 3 &&
    value.currentSession !== null &&
    !isRecord(value.currentSession)
  ) {
    throw new PlayerStateImportError("Progress file has an invalid current session");
  }
  if (value.version === 3 && !isValidGradedSeedFilter(value.gradedSeedFilter)) {
    throw new PlayerStateImportError("Progress file has invalid replay protection data");
  }
}

export function importPlayerState(serialized: string): PlayerState {
  if (new TextEncoder().encode(serialized).byteLength > MAX_IMPORT_BYTES) {
    throw new PlayerStateImportError("Progress file is too large");
  }

  try {
    const parsed = JSON.parse(serialized) as unknown;
    assertCompleteImportedState(parsed);
    return migratePlayerState(parsed);
  } catch (error) {
    if (error instanceof PlayerStateImportError) throw error;
    throw new PlayerStateImportError("Progress is not valid JSON", { cause: error });
  }
}

export function setCurrentChallenge(
  state: PlayerState,
  seed: string | null,
): PlayerState {
  if (seed !== null && (seed.length === 0 || seed.length > 128)) {
    throw new RangeError("Challenge seed must contain 1–128 characters");
  }
  if (seed === null) {
    return { ...state, currentSeed: null, currentSession: null };
  }
  if (state.currentSession?.seed === seed) {
    return { ...state, currentSeed: seed };
  }
  return {
    ...state,
    currentSeed: seed,
    currentSession: {
      seed,
      confidence: "pretty-sure",
      selectedAnswerIds: [],
      feedback: null,
    },
  };
}

export function setCurrentChallengeSession(
  state: PlayerState,
  session: ChallengeSession,
): PlayerState {
  const sanitized = sanitizeChallengeSession(session, null);
  if (!sanitized) throw new RangeError("Challenge session must contain a valid seed");
  return {
    ...state,
    currentSeed: sanitized.seed,
    currentSession: sanitized,
  };
}

export function hasGradedChallenge(
  state: PlayerState,
  seed: string,
): boolean {
  return hasGradedSeed(state.gradedSeedFilter, seed);
}

const SUBJECTIVE_PROBABILITY: Readonly<Record<AnswerConfidence, number>> = {
  guess: 0.5,
  "pretty-sure": 0.75,
  certain: 0.95,
};

function recordConcept(
  existing: ConceptStats | undefined,
  playerRating: number,
  challengeDifficulty: number,
  correct: boolean,
  confidence: AnswerConfidence,
): ConceptStats {
  const previous: ConceptStats = existing ?? {
    attempted: 0,
    correct: 0,
    streak: 0,
    proficiency: playerRating,
    uncertainty: DEFAULT_UNCERTAINTY,
    lastDifficulty: challengeDifficulty,
    recentResults: [],
  };
  const update = updateRating({
    rating: previous.proficiency,
    uncertainty: previous.uncertainty,
    challengeDifficulty,
    correct,
    confidence,
  });

  return {
    attempted: previous.attempted + 1,
    correct: previous.correct + (correct ? 1 : 0),
    streak: correct ? previous.streak + 1 : 0,
    proficiency: update.rating,
    uncertainty: update.uncertainty,
    lastDifficulty: challengeDifficulty,
    recentResults: [...previous.recentResults, correct].slice(-MAX_CONCEPT_RESULTS),
  };
}

export interface RecordChallengeResultOptions {
  readonly correct: boolean;
  readonly confidence?: AnswerConfidence;
}

export function recordChallengeResult(
  state: PlayerState,
  challenge: Challenge,
  options: RecordChallengeResultOptions,
): PlayerState {
  // Keep this guard inside the state transition as well as in the UI. That
  // makes accidental double submissions and old share-link replays idempotent.
  if (hasGradedChallenge(state, challenge.seed)) return state;

  const confidence = options.confidence ?? "pretty-sure";
  const update = updateRating({
    rating: state.rating,
    uncertainty: state.uncertainty,
    challengeDifficulty: challenge.difficulty,
    correct: options.correct,
    confidence,
  });
  const statsByConcept: Record<string, ConceptStats> = { ...state.statsByConcept };

  for (const concept of new Set(challenge.concepts)) {
    statsByConcept[concept] = recordConcept(
      statsByConcept[concept],
      state.rating,
      challenge.difficulty,
      options.correct,
      confidence,
    );
  }

  const subjective = SUBJECTIVE_PROBABILITY[confidence];
  const outcome = options.correct ? 1 : 0;
  const sampleCalibration = 1 - (subjective - outcome) ** 2;
  const calibrationSamples = state.calibrationSamples + 1;
  const calibration =
    (state.calibration * state.calibrationSamples + sampleCalibration) /
    calibrationSamples;
  const recentSeeds = [
    ...state.recentSeeds.filter((seed) => seed !== challenge.seed),
    challenge.seed,
  ].slice(-MAX_RECENT_SEEDS);
  const result: RecentChallengeResult = {
    seed: challenge.seed,
    templateId: challenge.templateId,
    difficulty: challenge.difficulty,
    concepts: [...challenge.concepts],
    correct: options.correct,
    confidence,
    ratingDelta: update.delta,
  };
  const hardestCorrectChallenge =
    options.correct &&
    (!state.hardestCorrectChallenge ||
      challenge.difficulty > state.hardestCorrectChallenge.difficulty)
      ? {
          seed: challenge.seed,
          templateId: challenge.templateId,
          title: challenge.title,
          difficulty: challenge.difficulty,
        }
      : state.hardestCorrectChallenge;

  return {
    ...state,
    rating: update.rating,
    uncertainty: update.uncertainty,
    streak: options.correct ? state.streak + 1 : 0,
    totalAnswered: state.totalAnswered + 1,
    correctAnswered: state.correctAnswered + (options.correct ? 1 : 0),
    calibration,
    calibrationSamples,
    statsByConcept,
    recentSeeds,
    recentResults: [...state.recentResults, result].slice(-MAX_RECENT_RESULTS),
    rustyState: getRustyStage(update.rating).level,
    gradedSeedFilter: addGradedSeed(state.gradedSeedFilter, challenge.seed),
    hardestCorrectChallenge,
  };
}

export function getAccuracy(state: PlayerState): number {
  return state.totalAnswered === 0
    ? 0
    : state.correctAnswered / state.totalAnswered;
}

export function getWeakConcepts(state: PlayerState, limit = 5): readonly string[] {
  return Object.entries(state.statsByConcept)
    .sort(([, left], [, right]) => {
      const leftScore = left.proficiency - left.uncertainty * 0.35;
      const rightScore = right.proficiency - right.uncertainty * 0.35;
      return leftScore - rightScore || right.attempted - left.attempted;
    })
    .slice(0, Math.max(0, limit))
    .map(([concept]) => concept);
}
