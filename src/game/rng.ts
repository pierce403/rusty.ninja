import type { RNG } from "./types";

const UINT32_RANGE = 0x1_0000_0000;

/** xmur3 string hash by bryc, used only to derive a stable 32-bit PRNG state. */
function xmur3(value: string): () => number {
  let hash = 1_779_033_703 ^ value.length;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3_432_918_353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2_246_822_507);
    hash = Math.imul(hash ^ (hash >>> 13), 3_266_489_909);
    return (hash ^= hash >>> 16) >>> 0;
  };
}
/** mulberry32, with explicit unsigned coercions so output is stable across JS engines. */
function mulberry32(initialState: number): () => number {
  let state = initialState >>> 0;

  return () => {
    state = (state + 0x6d2b_79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`);
  }
}

class SeededRNG implements RNG {
  public readonly seed: string;

  readonly #random: () => number;

  public constructor(seed: string) {
    if (seed.length === 0) {
      throw new TypeError("A deterministic seed cannot be empty");
    }

    this.seed = seed;
    this.#random = mulberry32(xmur3(seed)());
  }

  public next(): number {
    return this.#random();
  }

  public float(min = 0, max = 1): number {
    assertFinite(min, "min");
    assertFinite(max, "max");

    if (max <= min) {
      throw new RangeError("max must be greater than min");
    }

    return min + this.next() * (max - min);
  }

  public int(min: number, max: number): number {
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
      throw new RangeError("integer bounds must be safe integers");
    }

    if (max < min) {
      throw new RangeError("max must be greater than or equal to min");
    }

    const range = max - min + 1;
    if (!Number.isSafeInteger(range) || range <= 0) {
      throw new RangeError("integer range is too large");
    }

    return min + Math.floor(this.next() * range);
  }

  public bool(probability = 0.5): boolean {
    assertFinite(probability, "probability");

    if (probability < 0 || probability > 1) {
      throw new RangeError("probability must be between 0 and 1");
    }

    return this.next() < probability;
  }

  public pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new RangeError("cannot pick from an empty collection");
    }

    return items[this.int(0, items.length - 1)] as T;
  }

  public shuffle<T>(items: readonly T[]): T[] {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = this.int(0, index);
      [shuffled[index], shuffled[swapIndex]] = [
        shuffled[swapIndex] as T,
        shuffled[index] as T,
      ];
    }

    return shuffled;
  }

  public weightedPick<T>(items: readonly T[], weights: readonly number[]): T {
    if (items.length === 0 || items.length !== weights.length) {
      throw new RangeError("items and weights must be non-empty and have equal length");
    }

    let total = 0;
    for (const weight of weights) {
      assertFinite(weight, "weight");
      if (weight < 0) {
        throw new RangeError("weights cannot be negative");
      }
      total += weight;
    }

    if (total <= 0) {
      throw new RangeError("at least one weight must be positive");
    }

    let cursor = this.next() * total;
    for (let index = 0; index < items.length; index += 1) {
      cursor -= weights[index] as number;
      if (cursor < 0) {
        return items[index] as T;
      }
    }

    // Floating-point rounding can leave cursor at exactly zero.
    return items[items.length - 1] as T;
  }

  public fork(namespace: string): RNG {
    if (namespace.length === 0) {
      throw new TypeError("An RNG namespace cannot be empty");
    }
    return createRng(`${this.seed}\u241f${namespace}`);
  }
}

export function createRng(seed: string | number): RNG {
  return new SeededRNG(String(seed));
}

/** Produce a compact seed for a new run. Reproduction never depends on this entropy source. */
export function createRandomSeed(): string {
  const values = new Uint32Array(2);
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(values);
  } else {
    values[0] = Math.floor(Math.random() * UINT32_RANGE);
    values[1] = Math.floor(Math.random() * UINT32_RANGE);
  }

  return Array.from(values, (value) => value.toString(16).padStart(8, "0"))
    .join("")
    .toUpperCase();
}
