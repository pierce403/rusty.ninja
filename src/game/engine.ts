import { hasGradedChallenge, type PlayerState } from "./player-state";
import { clamp, sampleTargetDifficulty } from "./rating";
import { createRandomSeed, createRng } from "./rng";
import { isValidShareSeed } from "./routing";
import type {
  AnswerSubmission,
  Challenge,
  ChallengeTemplate,
  GradeResult,
  RNG,
} from "./types";

const TEMPLATE_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
// Keeps the full canonical seed below the route/state 128-character ceiling.
const ENTROPY_PATTERN = /^[A-Za-z0-9_-]{4,48}$/;
const CANONICAL_SEED_VERSION = "R1";
const INTERACTION_TYPES = new Set([
  "multiple-choice",
  "safety-classification",
  "dangerous-line",
  "patch-selection",
  "breaking-input",
  "find-all",
  "severity-classification",
  "inspect-next",
]);
const FINDING_CLASSES = new Set([
  "language-behavior",
  "compile-error",
  "logic",
  "panic-dos",
  "security",
  "context-dependent",
  "unsoundness",
  "undefined-behavior",
]);
const CHALLENGE_TRACKS = new Set(["syntax-vocabulary"]);

export interface CanonicalChallengeSeed {
  readonly version: 1;
  readonly targetDifficulty: number;
  readonly templateId: string;
  readonly entropy: string;
}

export interface ChallengeEngineOptions {
  /** Injectable solely so deterministic tests do not depend on system entropy. */
  readonly seedFactory?: () => string;
}

export class ChallengeGenerationError extends Error {
  public readonly issues: readonly string[];

  public constructor(message: string, issues: readonly string[] = []) {
    super(message);
    this.name = "ChallengeGenerationError";
    this.issues = issues;
  }
}

export function encodeChallengeSeed(
  targetDifficulty: number,
  templateId: string,
  entropy: string,
): string {
  if (!TEMPLATE_ID_PATTERN.test(templateId) || templateId.length > 64) {
    throw new TypeError("Template IDs must be 1–64 lowercase dotted or kebab-case characters");
  }
  if (!ENTROPY_PATTERN.test(entropy)) {
    throw new TypeError("Challenge entropy must be 4–48 URL-safe characters");
  }

  const difficulty = Math.round(clamp(targetDifficulty, 0, 10) * 1_000);
  return `${CANONICAL_SEED_VERSION}~${String(difficulty).padStart(5, "0")}~${templateId}~${entropy}`;
}

export function decodeChallengeSeed(seed: string): CanonicalChallengeSeed | null {
  const parts = seed.split("~");
  if (parts.length !== 4 || parts[0] !== CANONICAL_SEED_VERSION) return null;
  const [, encodedDifficulty, templateId, entropy] = parts;
  if (
    !/^\d{5}$/.test(encodedDifficulty as string) ||
    !TEMPLATE_ID_PATTERN.test(templateId as string) ||
    (templateId as string).length > 64 ||
    !ENTROPY_PATTERN.test(entropy as string)
  ) {
    return null;
  }

  const millilevel = Number(encodedDifficulty);
  if (millilevel < 0 || millilevel > 10_000) return null;
  return {
    version: 1,
    targetDifficulty: millilevel / 1_000,
    templateId: templateId as string,
    entropy: entropy as string,
  };
}

function compactEntropy(rawEntropy: string): string {
  if (ENTROPY_PATTERN.test(rawEntropy)) return rawEntropy;
  const rng = createRng(`entropy:${rawEntropy}`);
  return [rng.next(), rng.next()]
    .map((value) => Math.floor(value * 0x1_0000_0000).toString(16).padStart(8, "0"))
    .join("")
    .toUpperCase();
}

function distanceToRange(value: number, min: number, max: number): number {
  if (value < min) return min - value;
  if (value > max) return value - max;
  return 0;
}

function templateWeight(
  template: ChallengeTemplate,
  targetDifficulty: number,
  state?: PlayerState,
): number {
  const midpoint = (template.minDifficulty + template.maxDifficulty) / 2;
  let weight = 1 / (1 + Math.abs(targetDifficulty - midpoint) * 0.12);

  if (!state) return weight;

  if (
    template.track === "syntax-vocabulary" &&
    state.totalAnswered < 18 &&
    targetDifficulty <= 2.5
  ) {
    const openingProgress = state.totalAnswered / 18;
    weight *= 1.5 + (1 - openingProgress);
  }

  let conceptWeight = 0;
  for (const concept of template.concepts) {
    const stats = state.statsByConcept[concept];
    if (!stats) {
      conceptWeight += 1.08;
      continue;
    }
    const weakness = clamp((state.rating - stats.proficiency) / 3, -0.15, 0.8);
    const recentMisses = stats.recentResults.slice(-4).filter((result) => !result).length;
    conceptWeight += 1 + weakness + recentMisses * 0.08;
  }

  if (template.concepts.length > 0) {
    weight *= conceptWeight / template.concepts.length;
  }

  const recentTemplateIds = state.recentResults.slice(-3).map((result) => result.templateId);
  if (recentTemplateIds.at(-1) === template.id) {
    weight *= 0.32;
  } else if (recentTemplateIds.includes(template.id)) {
    weight *= 0.72;
  }

  return Math.max(weight, 0.001);
}

export function selectChallengeTemplate(
  templates: readonly ChallengeTemplate[],
  targetDifficulty: number,
  rng: RNG,
  state?: PlayerState,
): ChallengeTemplate {
  if (templates.length === 0) {
    throw new ChallengeGenerationError("No challenge templates are registered");
  }

  const exact = templates.filter(
    (template) =>
      targetDifficulty >= template.minDifficulty &&
      targetDifficulty <= template.maxDifficulty,
  );
  const candidates = exact.length > 0
    ? exact
    : [...templates].sort(
        (left, right) =>
          distanceToRange(targetDifficulty, left.minDifficulty, left.maxDifficulty) -
          distanceToRange(targetDifficulty, right.minDifficulty, right.maxDifficulty),
      ).slice(0, Math.min(3, templates.length));
  return rng.weightedPick(
    candidates,
    candidates.map((template) => templateWeight(template, targetDifficulty, state)),
  );
}

function requiredText(value: string, field: string, issues: string[]): void {
  if (value.trim().length === 0) issues.push(`${field} cannot be empty`);
}

/** Runtime invariants catch generator bugs before a dubious question reaches a player. */
export function validateChallenge(
  challenge: Challenge,
  template?: ChallengeTemplate,
): readonly string[] {
  const issues: string[] = [];
  requiredText(challenge.seed, "seed", issues);
  requiredText(challenge.templateId, "templateId", issues);
  requiredText(challenge.title, "title", issues);
  requiredText(challenge.code, "code", issues);
  requiredText(challenge.question, "question", issues);
  requiredText(challenge.explanation, "explanation", issues);
  requiredText(challenge.impact, "impact", issues);
  requiredText(challenge.auditorTakeaway, "auditorTakeaway", issues);

  if (!Number.isFinite(challenge.difficulty) || challenge.difficulty < 0 || challenge.difficulty > 10) {
    issues.push("difficulty must be finite and between 0 and 10");
  }
  if (
    template &&
    (challenge.difficulty < template.minDifficulty ||
      challenge.difficulty > template.maxDifficulty)
  ) {
    issues.push("difficulty falls outside its template's declared range");
  }
  if (challenge.concepts.length === 0) {
    issues.push("at least one concept is required");
  }
  if (challenge.track && !CHALLENGE_TRACKS.has(challenge.track)) {
    issues.push("track is not supported");
  }
  if (template?.track && challenge.track !== template.track) {
    issues.push("challenge track does not match its template");
  }
  if (!INTERACTION_TYPES.has(challenge.interactionType)) {
    issues.push("interactionType is not supported");
  }
  if (!FINDING_CLASSES.has(challenge.findingClass)) {
    issues.push("findingClass is not supported");
  }
  if (challenge.answers.length < 2) {
    issues.push("at least two answers are required");
  }

  const ids = challenge.answers.map((answer) => answer.id);
  if (ids.some((id) => id.trim().length === 0)) {
    issues.push("answer IDs cannot be empty");
  }
  if (new Set(ids).size !== ids.length) {
    issues.push("answer IDs must be unique");
  }
  if (challenge.answers.some((answer) => answer.label.trim().length === 0)) {
    issues.push("answer labels cannot be empty");
  }

  const correctIds =
    challenge.interactionType === "find-all"
      ? [...challenge.correctAnswer]
      : [challenge.correctAnswer];
  if (correctIds.length === 0) {
    issues.push("at least one correct answer is required");
  }
  if (new Set(correctIds).size !== correctIds.length) {
    issues.push("correct answers cannot contain duplicate IDs");
  }
  if (correctIds.some((id) => !ids.includes(id))) {
    issues.push("every correct answer ID must refer to an answer");
  }
  if (challenge.interactionType !== "find-all" && correctIds.length !== 1) {
    issues.push("single-choice challenges must have exactly one correct answer");
  }
  return issues;
}

export function gradeChallenge(
  challenge: Challenge,
  submission: AnswerSubmission,
): GradeResult {
  const selectedAnswerIds = typeof submission === "string"
    ? [submission]
    : [...new Set(submission)];
  const correctAnswerIds = challenge.interactionType === "find-all"
    ? [...challenge.correctAnswer]
    : [challenge.correctAnswer];
  const validIds = new Set(challenge.answers.map((answer) => answer.id));
  const correct =
    selectedAnswerIds.every((id) => validIds.has(id)) &&
    selectedAnswerIds.length === correctAnswerIds.length &&
    selectedAnswerIds.every((id) => correctAnswerIds.includes(id));

  return { correct, selectedAnswerIds, correctAnswerIds };
}

function validateTemplates(templates: readonly ChallengeTemplate[]): void {
  const issues: string[] = [];
  const ids = templates.map((template) => template.id);

  if (templates.length === 0) issues.push("at least one template is required");
  if (new Set(ids).size !== ids.length) issues.push("template IDs must be unique");
  for (const template of templates) {
    if (!TEMPLATE_ID_PATTERN.test(template.id) || template.id.length > 64) {
      issues.push(`invalid template ID: ${template.id}`);
    }
    if (
      !Number.isFinite(template.minDifficulty) ||
      !Number.isFinite(template.maxDifficulty) ||
      template.minDifficulty < 0 ||
      template.maxDifficulty > 10 ||
      template.minDifficulty > template.maxDifficulty
    ) {
      issues.push(`invalid difficulty range for template: ${template.id}`);
    }
    if (template.concepts.length === 0) {
      issues.push(`template has no concepts: ${template.id}`);
    }
    if (template.track && !CHALLENGE_TRACKS.has(template.track)) {
      issues.push(`template has an unsupported track: ${template.id}`);
    }
  }
  if (issues.length > 0) {
    throw new ChallengeGenerationError("Invalid challenge registry", issues);
  }
}

export class ChallengeEngine {
  readonly #templates: readonly ChallengeTemplate[];
  readonly #templatesById: ReadonlyMap<string, ChallengeTemplate>;
  readonly #seedFactory: () => string;

  public constructor(
    templates: readonly ChallengeTemplate[],
    options: ChallengeEngineOptions = {},
  ) {
    validateTemplates(templates);
    this.#templates = [...templates];
    this.#templatesById = new Map(templates.map((template) => [template.id, template]));
    this.#seedFactory = options.seedFactory ?? createRandomSeed;
  }

  public next(state: PlayerState): Challenge {
    let canonicalSeed = "";

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const rawEntropy = `${this.#seedFactory()}${attempt === 0 ? "" : `-${attempt}`}`;
      const entropy = compactEntropy(rawEntropy);
      const selectionRng = createRng(`selection:${entropy}`);
      const targetDifficulty = sampleTargetDifficulty(
        state.rating,
        state.uncertainty,
        selectionRng,
      );
      const template = selectChallengeTemplate(
        this.#templates,
        targetDifficulty,
        selectionRng,
        state,
      );
      canonicalSeed = encodeChallengeSeed(targetDifficulty, template.id, entropy);
      if (!hasGradedChallenge(state, canonicalSeed)) break;
    }

    return this.fromSeed(canonicalSeed);
  }

  public generateForPlayer(state: PlayerState): Challenge {
    return this.next(state);
  }

  public fromSeed(seed: string): Challenge {
    if (!isValidShareSeed(seed)) {
      throw new ChallengeGenerationError("Challenge seed is not URL-safe");
    }

    const canonical = decodeChallengeSeed(seed);
    let targetDifficulty: number;
    let template: ChallengeTemplate;

    if (canonical) {
      targetDifficulty = canonical.targetDifficulty;
      const exactTemplate = this.#templatesById.get(canonical.templateId);
      if (!exactTemplate) {
        throw new ChallengeGenerationError(
          `Challenge template is unavailable: ${canonical.templateId}`,
        );
      }
      template = exactTemplate;
    } else {
      const metadataRng = createRng(seed).fork("legacy-metadata");
      targetDifficulty = Math.round(metadataRng.float(0, 10) * 1_000) / 1_000;
      // Pre-R1 short links selected from the original untracked registry. Keep
      // opening-track additions from silently changing those shared challenges.
      const legacyTemplates = this.#templates.filter(
        (candidate) => candidate.track === undefined,
      );
      template = selectChallengeTemplate(
        legacyTemplates.length > 0 ? legacyTemplates : this.#templates,
        targetDifficulty,
        metadataRng,
      );
    }

    const generated = template.generate(createRng(seed), targetDifficulty);
    const challenge = {
      ...generated,
      seed,
      templateId: template.id,
    } as Challenge;
    const issues = validateChallenge(challenge, template);
    if (issues.length > 0) {
      throw new ChallengeGenerationError(
        `Template ${template.id} generated an invalid challenge`,
        issues,
      );
    }
    return challenge;
  }

  public reproduce(seed: string): Challenge {
    return this.fromSeed(seed);
  }

  public grade(challenge: Challenge, submission: AnswerSubmission): GradeResult {
    return gradeChallenge(challenge, submission);
  }
}

/** Alternate name retained for consumers that prefer the shorter game-domain term. */
export { ChallengeEngine as GameEngine };
