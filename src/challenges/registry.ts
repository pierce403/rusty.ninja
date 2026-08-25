import type { ChallengeTemplate } from "../game/types";
import { syntaxVocabularyTemplates } from "./syntax";
import {
  boundaryIndexTemplate,
  moveAfterMoveTemplate,
  refCellReentrancyTemplate,
} from "./foundations";
import {
  checkedRangeTemplate,
  narrowingLengthTemplate,
  signedAllocationTemplate,
} from "./integers";
import {
  allocationBeforeValidationTemplate,
  lexicalPathTemplate,
  serdeDefaultPrivilegeTemplate,
  splitSignatureTemplate,
  untaggedVariantTemplate,
} from "./parsing";
import {
  atomicPublicationTemplate,
  cancelledReadTemplate,
  mutexAcrossAwaitTemplate,
} from "./concurrency";
import {
  invalidBoolTemplate,
  maybeUninitHeaderTemplate,
  rawSliceContractTemplate,
  uncheckedOffByOneTemplate,
  vecOwnershipReconstructionTemplate,
} from "./unsafe";
import { callbackLifetimeTemplate, cStringOwnershipTemplate } from "./ffi";
import {
  deserializedInvariantTemplate,
  invalidSendTemplate,
  phantomIteratorTemplate,
  prePinSelfReferenceTemplate,
  twoMutableReferencesTemplate,
} from "./soundness";

/**
 * Ordered only for reviewability. Selection is difficulty-aware and seeded;
 * the engine does not walk this as a fixed quiz.
 */
export const challengeTemplates: readonly ChallengeTemplate[] = [
  ...syntaxVocabularyTemplates,
  moveAfterMoveTemplate,
  boundaryIndexTemplate,
  refCellReentrancyTemplate,
  narrowingLengthTemplate,
  checkedRangeTemplate,
  signedAllocationTemplate,
  allocationBeforeValidationTemplate,
  serdeDefaultPrivilegeTemplate,
  untaggedVariantTemplate,
  lexicalPathTemplate,
  splitSignatureTemplate,
  mutexAcrossAwaitTemplate,
  atomicPublicationTemplate,
  cancelledReadTemplate,
  rawSliceContractTemplate,
  uncheckedOffByOneTemplate,
  vecOwnershipReconstructionTemplate,
  invalidBoolTemplate,
  maybeUninitHeaderTemplate,
  cStringOwnershipTemplate,
  callbackLifetimeTemplate,
  twoMutableReferencesTemplate,
  invalidSendTemplate,
  prePinSelfReferenceTemplate,
  phantomIteratorTemplate,
  deserializedInvariantTemplate,
] as const;

export const challengeTemplatesById: ReadonlyMap<string, ChallengeTemplate> =
  new Map(challengeTemplates.map((template) => [template.id, template]));
