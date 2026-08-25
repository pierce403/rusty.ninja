/**
 * A fixed-size Bloom filter used to remember every challenge seed that has
 * already affected the rating. Bloom filters can produce false positives, but
 * never false negatives: a very old graded seed cannot become rateable again
 * merely because the visible recent-history list rolled over.
 */
export const GRADED_SEED_FILTER_VERSION = 1 as const;
export const GRADED_SEED_FILTER_BYTE_COUNT = 32 * 1_024;
export const GRADED_SEED_FILTER_BIT_COUNT = GRADED_SEED_FILTER_BYTE_COUNT * 8;
export const GRADED_SEED_FILTER_HASH_COUNT = 7;

export interface GradedSeedFilterV1 {
  readonly version: typeof GRADED_SEED_FILTER_VERSION;
  readonly bitCount: typeof GRADED_SEED_FILTER_BIT_COUNT;
  readonly hashCount: typeof GRADED_SEED_FILTER_HASH_COUNT;
  /** Empty is the canonical compact encoding of an all-zero bitset. */
  readonly bits: string;
  readonly insertions: number;
}

export type GradedSeedFilter = GradedSeedFilterV1;

export function createGradedSeedFilter(): GradedSeedFilter {
  return {
    version: GRADED_SEED_FILTER_VERSION,
    bitCount: GRADED_SEED_FILTER_BIT_COUNT,
    hashCount: GRADED_SEED_FILTER_HASH_COUNT,
    bits: "",
    insertions: 0,
  };
}

function hashSeed(seed: string, initial: number): number {
  let hash = initial >>> 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
    hash ^= hash >>> 13;
  }
  return hash >>> 0;
}

function bitIndexes(seed: string): readonly number[] {
  const first = hashSeed(seed, 0x811c9dc5);
  // An odd second hash makes double hashing cover the power-of-two bitset well.
  const second = (hashSeed(seed, 0x9e3779b9) | 1) >>> 0;
  return Array.from({ length: GRADED_SEED_FILTER_HASH_COUNT }, (_, index) =>
    (first + Math.imul(index, second) + Math.imul(index, index * 0x27d4eb2d)) >>> 0,
  ).map((hash) => hash % GRADED_SEED_FILTER_BIT_COUNT);
}

function decodeBits(encoded: string): Uint8Array | null {
  if (encoded === "") return new Uint8Array(GRADED_SEED_FILTER_BYTE_COUNT);
  // Exact byte count has one canonical padded base64 length.
  if (encoded.length !== Math.ceil(GRADED_SEED_FILTER_BYTE_COUNT / 3) * 4) {
    return null;
  }

  try {
    const binary = atob(encoded);
    if (binary.length !== GRADED_SEED_FILTER_BYTE_COUNT) return null;
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

function encodeBits(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x4_000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export function isValidGradedSeedFilter(value: unknown): value is GradedSeedFilter {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Partial<Record<keyof GradedSeedFilter, unknown>>;
  return candidate.version === GRADED_SEED_FILTER_VERSION &&
    candidate.bitCount === GRADED_SEED_FILTER_BIT_COUNT &&
    candidate.hashCount === GRADED_SEED_FILTER_HASH_COUNT &&
    typeof candidate.bits === "string" &&
    decodeBits(candidate.bits) !== null &&
    typeof candidate.insertions === "number" &&
    Number.isSafeInteger(candidate.insertions) &&
    candidate.insertions >= 0;
}

export function hasGradedSeed(filter: GradedSeedFilter, seed: string): boolean {
  const bytes = decodeBits(filter.bits);
  if (!bytes) return false;
  return bitIndexes(seed).every((bitIndex) => {
    const byte = bytes[Math.floor(bitIndex / 8)] as number;
    return (byte & (1 << (bitIndex % 8))) !== 0;
  });
}

export function addGradedSeed(
  filter: GradedSeedFilter,
  seed: string,
): GradedSeedFilter {
  const bytes = decodeBits(filter.bits) ?? new Uint8Array(GRADED_SEED_FILTER_BYTE_COUNT);
  let changed = false;
  for (const bitIndex of bitIndexes(seed)) {
    const byteIndex = Math.floor(bitIndex / 8);
    const mask = 1 << (bitIndex % 8);
    const previous = bytes[byteIndex] as number;
    if ((previous & mask) === 0) {
      bytes[byteIndex] = previous | mask;
      changed = true;
    }
  }

  if (!changed) return filter;
  return {
    version: GRADED_SEED_FILTER_VERSION,
    bitCount: GRADED_SEED_FILTER_BIT_COUNT,
    hashCount: GRADED_SEED_FILTER_HASH_COUNT,
    bits: encodeBits(bytes),
    insertions: Math.min(Number.MAX_SAFE_INTEGER, filter.insertions + 1),
  };
}

export function sanitizeGradedSeedFilter(
  value: unknown,
  knownGradedSeeds: readonly string[] = [],
): GradedSeedFilter {
  let filter = isValidGradedSeedFilter(value) ? value : createGradedSeedFilter();
  for (const seed of knownGradedSeeds) filter = addGradedSeed(filter, seed);
  return filter;
}
