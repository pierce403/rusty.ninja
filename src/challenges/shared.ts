import type {
  Answer,
  Challenge,
  ChallengeInteractionType,
  ChallengeTrack,
  FindingClass,
  MultiSelectInteractionType,
  RNG,
  SingleChoiceInteractionType,
} from "../game/types";

export interface ChoiceSpec {
  readonly id: string;
  readonly label: string;
  readonly explanation?: string;
}

interface BaseSpec {
  readonly templateId: string;
  readonly difficulty: number;
  readonly concepts: readonly string[];
  readonly track?: ChallengeTrack;
  readonly title: string;
  readonly code: string;
  readonly question: string;
  readonly answers: readonly ChoiceSpec[];
  readonly explanation: string;
  readonly impact: string;
  readonly fixedCode?: string;
  readonly auditorTakeaway: string;
  readonly findingClass: FindingClass;
}

interface SingleSpec extends BaseSpec {
  readonly interactionType: SingleChoiceInteractionType;
  readonly correctAnswer: string;
}

interface MultiSpec extends BaseSpec {
  readonly interactionType: MultiSelectInteractionType;
  readonly correctAnswer: readonly string[];
}

function normalizedAnswers(rng: RNG, answers: readonly ChoiceSpec[]): Answer[] {
  return rng.shuffle(answers).map((answer) => ({ ...answer }));
}

export function singleChallenge(rng: RNG, spec: SingleSpec): Challenge {
  return {
    ...spec,
    seed: rng.seed,
    answers: normalizedAnswers(rng.fork("answer-order"), spec.answers),
  };
}

export function multiChallenge(rng: RNG, spec: MultiSpec): Challenge {
  return {
    ...spec,
    seed: rng.seed,
    answers: normalizedAnswers(rng.fork("answer-order"), spec.answers),
  };
}

export function boundedDifficulty(
  target: number,
  min: number,
  max: number,
  rng: RNG,
  jitter = 0.12,
): number {
  const adjusted = target + rng.float(-jitter, jitter);
  return Math.round(Math.min(max, Math.max(min, adjusted)) * 100) / 100;
}

export function code(lines: readonly string[]): string {
  return lines.join("\n");
}

export function interactionLabel(type: ChallengeInteractionType): string {
  const labels: Record<ChallengeInteractionType, string> = {
    "multiple-choice": "Choose one",
    "safety-classification": "Safe, unsafe, or depends",
    "dangerous-line": "Select a line",
    "patch-selection": "Choose the patch",
    "breaking-input": "Find the input",
    "find-all": "Select all that apply",
    "severity-classification": "Classify severity",
    "inspect-next": "Choose what to inspect",
  };
  return labels[type];
}
