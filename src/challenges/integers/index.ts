import type { ChallengeTemplate } from "../../game/types";
import { boundedDifficulty, code, singleChallenge } from "../shared";

export const narrowingLengthTemplate: ChallengeTemplate = {
  id: "integers.narrowing-length.v1",
  concepts: ["integer-casts", "truncation", "parsing", "validation"],
  minDifficulty: 2.4,
  maxDifficulty: 5.2,
  generate(rng, targetDifficulty) {
    const narrow = rng.pick(["u8", "u16"] as const);
    const wrap = narrow === "u8" ? 256 : 65_536;
    const claimedType = rng.pick(["u32", "u64"] as const);
    const field = rng.pick(["claimed_len", "wire_len", "body_len"]);

    return singleChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "A length that changes shape",
      code: code([
        `fn body<'a>(input: &'a [u8], ${field}: ${claimedType})`,
        `    -> Result<&'a [u8], ParseError>`,
        `{`,
        `    let len = ${field} as ${narrow} as usize;`,
        `    if input.len() < len {`,
        `        return Err(ParseError::Short);`,
        `    }`,
        `    Ok(&input[..len])`,
        `}`,
      ]),
      question: "Which patch removes the truncation boundary without silently changing the value?",
      interactionType: "patch-selection",
      answers: [
        { id: "try", label: `let len = usize::try_from(${field}).map_err(|_| ParseError::Length)?;` },
        { id: "saturate", label: `let len = ${field}.min(${narrow}::MAX as ${claimedType}) as usize;` },
        { id: "wrap", label: `let len = ${field}.wrapping_add(0) as ${narrow} as usize;` },
        { id: "assert", label: `debug_assert!(${field} < ${wrap}); let len = ${field} as ${narrow} as usize;` },
      ],
      correctAnswer: "try",
      explanation: `The two as casts reduce the wire value modulo ${wrap}. A claim of ${wrap} becomes zero, so validation and parsing can disagree about the authenticated or consumed body. try_from makes an architecture conversion explicit and fallible.`,
      impact: "Depending on how the caller frames, signs, or authorizes the remaining bytes, truncation can cause parser desynchronization or validation bypass. It is not memory unsafety by itself.",
      fixedCode: code([
        `let len = usize::try_from(${field})`,
        `    .map_err(|_| ParseError::Length)?;`,
        `let body = input.get(..len).ok_or(ParseError::Short)?;`,
      ]),
      auditorTakeaway: "Treat every narrowing conversion of attacker-controlled sizes as a trust boundary.",
      findingClass: "security",
    });
  },
};

export const checkedRangeTemplate: ChallengeTemplate = {
  id: "integers.checked-range.v1",
  concepts: ["integer-overflow", "offset-length", "indexing", "debug-vs-release"],
  minDifficulty: 3.2,
  maxDifficulty: 5.8,
  generate(rng, targetDifficulty) {
    const buffer = rng.pick(["record", "packet", "image"]);
    const offset = rng.pick(["offset", "start", "cursor"]);

    return singleChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "The wrapped range check",
      code: code([
        `fn field(${buffer}: &[u8], ${offset}: usize, len: usize)`,
        `    -> Option<&[u8]>`,
        `{`,
        `    if ${offset} + len > ${buffer}.len() {`,
        `        return None;`,
        `    }`,
        `    Some(&${buffer}[${offset}..${offset} + len])`,
        `}`,
      ]),
      question: "Which replacement is correct in both debug and optimized builds?",
      interactionType: "patch-selection",
      answers: [
        { id: "checked-get", label: `let end = ${offset}.checked_add(len)?; ${buffer}.get(${offset}..end)` },
        { id: "wrapping", label: `let end = ${offset}.wrapping_add(len); Some(&${buffer}[${offset}..end])` },
        { id: "saturating", label: `Some(&${buffer}[${offset}..${offset}.saturating_add(len)])` },
        { id: "release", label: "Keep it; release-mode wrapping makes the check safe" },
      ],
      correctAnswer: "checked-get",
      explanation: "offset + len can panic on overflow when overflow checks are enabled and wrap when they are not. The wrapped value can pass the guard, but safe slice indexing can still panic. checked_add plus get handles both arithmetic and bounds failures.",
      impact: "With attacker-controlled offsets this is a reliable panic/denial-of-service surface. Because slicing is safe, the shown code does not become out-of-bounds memory access or UB.",
      fixedCode: code([
        `fn field(${buffer}: &[u8], ${offset}: usize, len: usize)`,
        `    -> Option<&[u8]>`,
        `{`,
        `    let end = ${offset}.checked_add(len)?;`,
        `    ${buffer}.get(${offset}..end)`,
        `}`,
      ]),
      auditorTakeaway: "Validate offset + length as one checked operation, then use get for the range.",
      findingClass: "panic-dos",
    });
  },
};

export const signedAllocationTemplate: ChallengeTemplate = {
  id: "integers.signed-allocation.v1",
  concepts: ["signed-conversions", "allocation", "resource-exhaustion", "limits"],
  minDifficulty: 2.8,
  maxDifficulty: 5.0,
  generate(rng, targetDifficulty) {
    const count = rng.pick(["item_count", "node_count", "entry_count"]);
    const limit = rng.pick([1024, 4096, 16_384]);

    return singleChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Negative capacity",
      code: code([
        `fn decode(${count}: i32, input: &[u8]) -> Result<Vec<u8>, Error> {`,
        `    let mut out = Vec::with_capacity(${count} as usize);`,
        `    out.extend(input.iter().take(${count} as usize));`,
        `    Ok(out)`,
        `}`,
      ]),
      question: "How should an auditor classify the primary reachable failure for count = -1?",
      interactionType: "severity-classification",
      answers: [
        { id: "dos", label: "Safe-code denial of service via huge reservation/panic" },
        { id: "ub", label: "Undefined behavior from a negative pointer offset" },
        { id: "compile", label: "Compiler error: signed values cannot be cast" },
        { id: "empty", label: "Harmless: -1 becomes zero" },
      ],
      correctAnswer: "dos",
      explanation: "Rust's as conversion maps -1 to usize::MAX. Vec then attempts an impossible capacity and may panic (or the process may abort on allocation failure). No raw pointer access is present here.",
      impact: "An untrusted count can terminate a request worker or process and create a denial of service. Exact behavior depends on the allocator and panic strategy, but it is not memory UB in the shown safe code.",
      fixedCode: code([
        `let count = usize::try_from(${count}).map_err(|_| Error::Count)?;`,
        `if count > ${limit} { return Err(Error::Count); }`,
        `let mut out = Vec::new();`,
        `out.try_reserve(count).map_err(|_| Error::Capacity)?;`,
      ]),
      auditorTakeaway: "Reject negative and unreasonable counts before converting or allocating.",
      findingClass: "panic-dos",
    });
  },
};
