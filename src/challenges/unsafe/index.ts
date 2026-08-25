import type { ChallengeTemplate } from "../../game/types";
import { boundedDifficulty, code, multiChallenge, singleChallenge } from "../shared";

export const rawSliceContractTemplate: ChallengeTemplate = {
  id: "unsafe.raw-slice-contract.v1",
  concepts: ["raw-pointers", "slices", "unsafe-contracts", "lifetimes"],
  minDifficulty: 5.3,
  maxDifficulty: 7.5,
  generate(rng, targetDifficulty) {
    const name = rng.pick(["borrow_bytes", "packet_view", "foreign_slice"]);

    return singleChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Unsafe is a contract, not a verdict",
      code: code([
        `/// # Safety`,
        `/// Caller must provide memory valid for the returned lifetime.`,
        `unsafe fn ${name}<'a>(ptr: *const u8, len: usize) -> &'a [u8] {`,
        `    unsafe { std::slice::from_raw_parts(ptr, len) }`,
        `}`,
      ]),
      question: "Is this function itself evidence of a vulnerability?",
      interactionType: "safety-classification",
      answers: [
        { id: "depends", label: "Depends: audit every caller against the full raw-slice contract" },
        { id: "vuln", label: "Always vulnerable because it contains unsafe" },
        { id: "safe", label: "Always safe because the function is marked unsafe" },
        { id: "compile", label: "It cannot compile because the lifetime is not tied to ptr" },
      ],
      correctAnswer: "depends",
      explanation: "from_raw_parts is valid only when ptr is non-null and aligned even for length zero, covers initialized readable bytes in one allocation, remains valid and immutable for 'a, and the total size fits Rust's limits. unsafe fn shifts those proof obligations to callers; it does not prove or disprove a vulnerability.",
      impact: "A caller that violates the contract can trigger UB, including out-of-bounds reads or dangling references. A caller that establishes every precondition can use the operation correctly.",
      fixedCode: code([
        `/// # Safety`,
        `/// ptr must be non-null/aligned and reference len initialized`,
        `/// bytes in one allocation, valid and immutable for 'a;`,
        `/// len must not exceed isize::MAX.`,
        `unsafe fn ${name}<'a>(ptr: *const u8, len: usize) -> &'a [u8] {`,
        `    unsafe { std::slice::from_raw_parts(ptr, len) }`,
        `}`,
      ]),
      auditorTakeaway: "Expand every unsafe call into a checklist of preconditions, then trace their evidence.",
      findingClass: "context-dependent",
    });
  },
};

export const uncheckedOffByOneTemplate: ChallengeTemplate = {
  id: "unsafe.unchecked-off-by-one.v1",
  concepts: ["get-unchecked", "unsafe-abstractions", "off-by-one", "undefined-behavior"],
  minDifficulty: 5.9,
  maxDifficulty: 7.9,
  generate(rng, targetDifficulty) {
    const slice = rng.pick(["table", "bytes", "slots"]);
    const index = rng.pick(["index", "slot", "cursor"]);

    return singleChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "The unchecked boundary",
      code: code([
        `pub fn read_or_zero(${slice}: &[u8], ${index}: usize) -> u8 {`,
        `    if ${index} <= ${slice}.len() {`,
        `        // SAFETY: index was checked above.`,
        `        unsafe { *${slice}.get_unchecked(${index}) }`,
        `    } else {`,
        `        0`,
        `    }`,
        `}`,
      ]),
      question: "Which line turns the boundary mistake into undefined behavior?",
      interactionType: "dangerous-line",
      answers: [
        { id: "signature", label: "Line 1 — the safe public signature" },
        { id: "comparison", label: "Line 2 — the <= check" },
        { id: "unchecked", label: "Line 4 — get_unchecked relies on a false precondition" },
        { id: "zero", label: "Line 6 — returning a zero byte" },
      ],
      correctAnswer: "unchecked",
      explanation: `The check admits ${index} == ${slice}.len(), but get_unchecked requires ${index} < len. Calling it out of bounds is UB even if adjacent memory happens to be readable. Because a safe caller can supply that index, the public abstraction is unsound.`,
      impact: "The optimizer may assume the impossible case never occurs. Effects are not limited to a predictable adjacent-byte read and can include arbitrary misbehavior.",
      fixedCode: code([
        `pub fn read_or_zero(${slice}: &[u8], ${index}: usize) -> u8 {`,
        `    ${slice}.get(${index}).copied().unwrap_or(0)`,
        `}`,
      ]),
      auditorTakeaway: "An unsafe precondition must be proven exactly; a near-equivalent bound is no proof.",
      findingClass: "unsoundness",
    });
  },
};

export const vecOwnershipReconstructionTemplate: ChallengeTemplate = {
  id: "unsafe.vec-from-raw-parts.v1",
  concepts: ["vec-from-raw-parts", "ownership", "allocators", "raw-pointers"],
  minDifficulty: 7.2,
  maxDifficulty: 9.0,
  generate(rng, targetDifficulty) {
    const functionName = rng.pick(["take_buffer", "adopt_bytes", "own_region"]);

    return multiChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Reconstructing ownership",
      code: code([
        `/// Takes ownership of a foreign buffer.`,
        `pub unsafe fn ${functionName}(`,
        `    ptr: *mut u8, len: usize, capacity: usize,`,
        `) -> Vec<u8> {`,
        `    unsafe { Vec::from_raw_parts(ptr, len, capacity) }`,
        `}`,
      ]),
      question: "Select every obligation required by Vec::from_raw_parts here.",
      interactionType: "find-all",
      answers: [
        { id: "allocator", label: "ptr came from the matching Rust allocator and allocation layout" },
        { id: "initialized", label: "The first len elements are initialized and len <= capacity" },
        { id: "unique", label: "Ownership is unique and nobody will free or use the allocation as owner" },
        { id: "layout", label: "capacity describes the original allocation and layout limits do not overflow" },
        { id: "nul", label: "The allocation ends in a NUL byte" },
        { id: "zero", label: "Every unused capacity byte is zero-initialized" },
      ],
      correctAnswer: ["allocator", "initialized", "unique", "layout"],
      explanation: "from_raw_parts does not copy memory; it asserts that this pointer, length, capacity, allocator, layout, initialization state, and ownership already describe a Vec allocation. Violating those facts can mis-deallocate, double-free, or expose uninitialized elements.",
      impact: "Calling this on malloc memory, a borrowed buffer, the wrong capacity, or shared ownership can produce allocator corruption, use-after-free, or double-free UB.",
      fixedCode: code([
        `// For a borrowed foreign buffer, validate ptr/len and copy:`,
        `let borrowed = unsafe { std::slice::from_raw_parts(ptr, len) };`,
        `let owned = borrowed.to_vec();`,
        `// If C transfers ownership, release it with C's matching free API.`,
      ]),
      auditorTakeaway: "Ownership reconstruction must match the allocation's complete origin story.",
      findingClass: "undefined-behavior",
    });
  },
};

export const invalidBoolTemplate: ChallengeTemplate = {
  id: "unsafe.invalid-bool-transmute.v1",
  concepts: ["transmute", "validity", "invalid-values", "undefined-behavior"],
  minDifficulty: 5.5,
  maxDifficulty: 7.4,
  generate(rng, targetDifficulty) {
    const input = rng.pick([2, 3, 0xff]);

    return singleChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Not every byte is a bool",
      code: code([
        `pub fn decode_flag(byte: u8) -> bool {`,
        `    // Protocol uses 0 for false and 1 for true.`,
        `    unsafe { std::mem::transmute::<u8, bool>(byte) }`,
        `}`,
      ]),
      question: `What happens when byte is ${input}?`,
      interactionType: "breaking-input",
      answers: [
        { id: "ub", label: "Creating the invalid bool value is undefined behavior" },
        { id: "true", label: "Every nonzero byte becomes true" },
        { id: "panic", label: "transmute performs a checked conversion and panics" },
        { id: "compile", label: "The sizes differ, so this is a compiler error" },
      ],
      correctAnswer: "ub",
      explanation: "u8 and bool have the same size, so the transmute compiles. But Rust bool permits only the bit patterns 0 and 1. Producing an invalid value violates the validity invariant and is UB.",
      impact: "This is not a recoverable parse error. Once an invalid bool is produced, the optimizer's assumptions are broken and behavior is unrestricted.",
      fixedCode: code([
        `match byte {`,
        `    0 => Ok(false),`,
        `    1 => Ok(true),`,
        `    _ => Err(ParseError::InvalidFlag),`,
        `}`,
      ]),
      auditorTakeaway: "Size equality is not validity equality; validate bit patterns before constructing typed values.",
      findingClass: "undefined-behavior",
    });
  },
};

export const maybeUninitHeaderTemplate: ChallengeTemplate = {
  id: "unsafe.maybeuninit-header.v1",
  concepts: ["maybeuninit", "validity", "structure-layout", "parsing", "unsafe-abstractions"],
  minDifficulty: 7.4,
  maxDifficulty: 9.2,
  generate(rng, targetDifficulty) {
    const typeName = rng.pick(["Header", "RecordPrefix", "WireFlags"]);
    const flag = rng.pick(["compressed", "authenticated", "encrypted"]);

    return multiChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Copied bytes are not initialized values",
      code: code([
        `#[repr(C)]`,
        `struct ${typeName} {`,
        `    len: u32,`,
        `    ${flag}: bool,`,
        `}`,
        ``,
        `pub fn decode(input: &[u8]) -> ${typeName} {`,
        `    let mut output = MaybeUninit::<${typeName}>::uninit();`,
        `    let copied = input.len().min(size_of::<${typeName}>());`,
        `    unsafe {`,
        `        ptr::copy_nonoverlapping(`,
        `            input.as_ptr(), output.as_mut_ptr().cast(), copied,`,
        `        );`,
        `        output.assume_init()`,
        `    }`,
        `}`,
      ]),
      question: "Select every accurate finding or protocol flaw.",
      interactionType: "find-all",
      answers: [
        { id: "partial", label: "A short input can leave required fields uninitialized before assume_init" },
        { id: "bool", label: `An input byte other than 0 or 1 can create an invalid ${flag} bool` },
        { id: "layout", label: "Raw native struct layout and endianness are not a stable wire format" },
        { id: "padding", label: "Reading a struct is UB unless every padding byte was initialized" },
        { id: "overlap", label: "copy_nonoverlapping is invalid because input and output always overlap" },
      ],
      correctAnswer: ["partial", "bool", "layout"],
      explanation: "MaybeUninit tracks whether the entire T is valid, not how many bytes happened to be copied. Required fields may remain uninitialized, and bool accepts only 0 and 1. Uninitialized padding alone is allowed, so demanding initialized padding is not the right finding.",
      impact: "The safe decode function can create an invalid Rust value and trigger immediate UB. Even well-formed bit patterns are interpreted through target-native layout and endianness, creating a separate portability/parser bug.",
      fixedCode: code([
        `let len = u32::from_le_bytes(`,
        `    input.get(..4).ok_or(Error::Short)?.try_into().unwrap(),`,
        `);`,
        `let ${flag} = match *input.get(4).ok_or(Error::Short)? {`,
        `    0 => false,`,
        `    1 => true,`,
        `    _ => return Err(Error::Flag),`,
        `};`,
        `Ok(${typeName} { len, ${flag} })`,
      ]),
      auditorTakeaway: "Initialization is a type invariant, not a byte-count invariant; parse fields into valid values explicitly.",
      findingClass: "unsoundness",
    });
  },
};
