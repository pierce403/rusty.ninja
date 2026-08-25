import { clamp, MAX_RATING, MIN_RATING } from "../game/rating";

export type RustyStageLevel = 0 | 2 | 4 | 6 | 8 | 10;

export interface RustyStage {
  readonly level: RustyStageLevel;
  readonly asset: string;
  readonly alt: string;
  readonly condition: string;
}
export interface RustyProgression {
  readonly stage: RustyStage;
  readonly nextStage: RustyStage | null;
  /** Progress from the current visual state to the next, in [0, 1]. */
  readonly stageProgress: number;
}

export const RUSTY_STAGES: readonly RustyStage[] = [
  {
    level: 0,
    asset: "/rusty/rusty-00.webp",
    alt: "Rusty with a cracked casing, loose wires, and a bent antenna",
    condition: "Badly damaged, but still booting",
  },
  {
    level: 2,
    asset: "/rusty/rusty-02.webp",
    alt: "Rusty partly repaired with one open panel and fewer loose wires",
    condition: "Patched enough to run diagnostics",
  },
  {
    level: 4,
    asset: "/rusty/rusty-04.webp",
    alt: "Rusty functional with charming mismatched replacement panels",
    condition: "Functional, if a little improvised",
  },
  {
    level: 6,
    asset: "/rusty/rusty-06.webp",
    alt: "Rusty cleanly repaired and standing with growing confidence",
    condition: "Reliable under ordinary load",
  },
  {
    level: 8,
    asset: "/rusty/rusty-08.webp",
    alt: "Rusty refined with upgraded sensors and subtle protective panels",
    condition: "Hardened and ready for hostile input",
  },
  {
    level: 10,
    asset: "/rusty/rusty-10.webp",
    alt: "Rusty fully restored, polished, upgraded, and ready for the world",
    condition: "Ready for the world",
  },
] as const;

export interface Rank {
  readonly minLevel: number;
  readonly name: string;
}

export const RANKS: readonly Rank[] = [
  { minLevel: 0, name: "Broken Build" },
  { minLevel: 1.25, name: "Borrow Checker Initiate" },
  { minLevel: 2.75, name: "Panic Spotter" },
  { minLevel: 4.25, name: "Integer Wrangler" },
  { minLevel: 5.75, name: "Concurrency Adept" },
  { minLevel: 7, name: "Unsafe Apprentice" },
  { minLevel: 8.25, name: "Soundness Hunter" },
  { minLevel: 9.5, name: "Unsafe Ninja" },
] as const;

export function getRustyProgression(rating: number): RustyProgression {
  const level = clamp(rating, MIN_RATING, MAX_RATING);
  let stageIndex = 0;

  for (let index = 1; index < RUSTY_STAGES.length; index += 1) {
    if (level < (RUSTY_STAGES[index] as RustyStage).level) {
      break;
    }
    stageIndex = index;
  }

  const stage = RUSTY_STAGES[stageIndex] as RustyStage;
  const nextStage = RUSTY_STAGES[stageIndex + 1] ?? null;
  const stageProgress = nextStage
    ? clamp(
        (level - stage.level) / (nextStage.level - stage.level),
        0,
        1,
      )
    : 1;

  return { stage, nextStage, stageProgress };
}

export function getRustyStage(rating: number): RustyStage {
  return getRustyProgression(rating).stage;
}

export function getRank(rating: number): Rank {
  const level = clamp(rating, MIN_RATING, MAX_RATING);
  let rank = RANKS[0] as Rank;

  for (const candidate of RANKS) {
    if (level < candidate.minLevel) {
      break;
    }
    rank = candidate;
  }

  return rank;
}
