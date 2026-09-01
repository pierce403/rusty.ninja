import { describe, expect, it } from "vitest";
import { challengeTemplates } from "../../src/challenges/registry";
import { ChallengeEngine } from "../../src/game/engine";
import type { Challenge } from "../../src/game/types";

const PRE_READING_CANONICAL_FIXTURES = [
  ["syntax.let-shadowing.v1", 0.425, "aa9546fd"],
  ["syntax.shared-reference.v1", 0.575, "1eaede4d"],
  ["syntax.mutable-reference.v1", 0.825, "88dab379"],
  ["syntax.slice-view.v1", 1.05, "b539cfa0"],
  ["syntax.question-mark.v1", 1.4, "6f59faf8"],
  ["syntax.explicit-lifetime.v1", 1.75, "551cbf62"],
  ["ownership.move-after-move.v1", 0.85, "c64f47a0"],
  ["foundations.boundary-index.v1", 1.575, "9f6f5f92"],
  ["foundations.refcell-reentrancy.v1", 3.35, "b75f7d21"],
  ["integers.narrowing-length.v1", 3.8, "a829831b"],
  ["integers.checked-range.v1", 4.5, "d3067cf1"],
  ["integers.signed-allocation.v1", 3.9, "4c477df3"],
  ["parsing.allocate-before-validate.v1", 4.65, "82c99d8b"],
  ["parsing.serde-default-privilege.v1", 5.25, "153b9b20"],
  ["parsing.untagged-first-match.v1", 6.45, "441668f6"],
  ["parsing.lexical-path-containment.v1", 6.1, "6a6cb456"],
  ["parsing.split-signature-stream.v1", 8.15, "d6af78e3"],
  ["concurrency.mutex-await-reentrance.v1", 6.15, "84d9e436"],
  ["concurrency.atomic-publication.v1", 7.15, "c2cc724c"],
  ["concurrency.cancelled-read-exact.v1", 7.65, "15f5f300"],
  ["unsafe.raw-slice-contract.v1", 6.4, "20c00d96"],
  ["unsafe.unchecked-off-by-one.v1", 6.9, "a9c4570f"],
  ["unsafe.vec-from-raw-parts.v1", 8.1, "19a537fd"],
  ["unsafe.invalid-bool-transmute.v1", 6.45, "aafe0e32"],
  ["unsafe.maybeuninit-header.v1", 8.3, "30672fa3"],
  ["ffi.cstring-ownership.v1", 7.4, "061f1137"],
  ["ffi.callback-lifetime.v1", 8.5, "2f9545f7"],
  ["soundness.two-mutable-references.v1", 8, "91c48243"],
  ["soundness.invalid-send.v1", 8.55, "2797a144"],
  ["soundness.pre-pin-self-reference.v1", 9.175, "ad3d2fef"],
  ["soundness.missing-phantomdata.v1", 8.7, "bdfd4d01"],
  ["soundness.deserialized-invariant.v1", 9.675, "8737d69a"],
] as const;

const LEGACY_SEED_FIXTURES = [
  ["7F3A91", "b144d4e7"],
  ["CAFE4030", "b7cea74d"],
  ["AUDIT007", "19fad3c8"],
] as const;

function challengeFingerprint(challenge: Challenge): string {
  let hash = 2_166_136_261;
  for (const character of JSON.stringify(challenge)) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function r1Seed(target: number, templateId: string, entropy: string): string {
  const difficulty = Math.round(Math.min(10, Math.max(0, target)) * 1_000);
  return `R1~${String(difficulty).padStart(5, "0")}~${templateId}~${entropy}`;
}

describe("share-seed compatibility", () => {
  const engine = new ChallengeEngine(challengeTemplates);

  it("preserves every canonical challenge that predates the reading track", () => {
    for (const [templateId, target, expectedHash] of PRE_READING_CANONICAL_FIXTURES) {
      const seed = r1Seed(target, templateId, "C0FFEE12");
      expect(challengeFingerprint(engine.fromSeed(seed)), templateId).toBe(expectedHash);
    }
  });

  it("preserves historical short share seeds when tracked templates are added", () => {
    for (const [seed, expectedHash] of LEGACY_SEED_FIXTURES) {
      expect(challengeFingerprint(engine.fromSeed(seed)), seed).toBe(expectedHash);
    }
  });
});
