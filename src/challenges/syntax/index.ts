import type { ChallengeTemplate } from "../../game/types";
import { boundedDifficulty, code, singleChallenge } from "../shared";

const TRACK = "syntax-vocabulary" as const;

export const shadowingTemplate: ChallengeTemplate = {
  id: "syntax.let-shadowing.v1",
  track: TRACK,
  concepts: ["syntax", "bindings", "immutability", "shadowing"],
  minDifficulty: 0,
  maxDifficulty: 0.85,
  generate(rng, targetDifficulty) {
    const name = rng.pick(["retries", "packets", "checks"]);
    const initial = rng.int(2, 7);
    const increment = rng.int(1, 3);

    return singleChallenge(rng, {
      templateId: this.id,
      track: TRACK,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "The second let",
      code: code([
        `fn main() {`,
        `    let ${name} = ${initial}_u8;`,
        `    let ${name} = ${name} + ${increment};`,
        `    println!("{${name}}");`,
        `}`,
      ]),
      question: `What does the second let ${name} do?`,
      interactionType: "multiple-choice",
      answers: [
        {
          id: "shadows",
          label: "Creates a new immutable binding that shadows the first",
        },
        {
          id: "mutates",
          label: "Mutates the first binding even though it lacks mut",
        },
        {
          id: "duplicate",
          label: "Causes a duplicate-variable compiler error",
        },
        {
          id: "heap",
          label: "Moves the integer into a new heap allocation",
        },
      ],
      correctAnswer: "shadows",
      explanation: `Repeating let creates a new binding named ${name}. Its initializer reads the earlier value, adds ${increment}, and then the new immutable binding shadows the old one. This is shadowing, not assignment or mutation.`,
      impact: "No bug is shown. During review, confusing shadowing with mutation can make a value-flow trace wrong, especially when validation transforms a value but reuses its name.",
      auditorTakeaway: "A repeated let creates a new binding; mut permits assignment to an existing binding.",
      findingClass: "language-behavior",
    });
  },
};

export const sharedReferenceTemplate: ChallengeTemplate = {
  id: "syntax.shared-reference.v1",
  track: TRACK,
  concepts: ["syntax", "references", "borrowing", "ownership"],
  minDifficulty: 0,
  maxDifficulty: 1.15,
  generate(rng, targetDifficulty) {
    const value = rng.pick(["payload", "label", "report"]);
    const functionName = rng.pick(["measure", "inspect_len", "byte_count"]);
    const text = rng.pick(["audit-me", "frame", "trusted?"]);

    return singleChallenge(rng, {
      templateId: this.id,
      track: TRACK,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "An ampersand on each side",
      code: code([
        `fn ${functionName}(value: &String) -> usize {`,
        `    value.len()`,
        `}`,
        ``,
        `fn main() {`,
        `    let ${value} = String::from("${text}");`,
        `    let length = ${functionName}(&${value});`,
        `    println!("{${value}}: {length}");`,
        `}`,
      ]),
      question: `What do &String and &${value} mean here?`,
      interactionType: "multiple-choice",
      answers: [
        {
          id: "shared-borrow",
          label: `The function receives a shared reference; ${value} keeps ownership`,
        },
        {
          id: "move",
          label: `The function takes ownership and drops ${value} on return`,
        },
        {
          id: "raw-pointer",
          label: "They create an unchecked raw pointer",
        },
        {
          id: "copy-string",
          label: "They copy the String and its heap buffer",
        },
      ],
      correctAnswer: "shared-borrow",
      explanation: `&${value} borrows the String and &String is the matching shared-reference type. The function can read through that reference without owning the String, so ${value} remains usable afterward. For a general text API, &str is often more flexible, but &String is valid Rust.`,
      impact: "No bug is shown. Ownership questions come first in an audit: establish whether a call moves, borrows, copies, or reconstructs ownership before reasoning about lifetime and cleanup.",
      auditorTakeaway: "&T is a checked shared reference to someone else's T; it does not transfer ownership.",
      findingClass: "language-behavior",
    });
  },
};

export const mutableReferenceTemplate: ChallengeTemplate = {
  id: "syntax.mutable-reference.v1",
  track: TRACK,
  concepts: ["syntax", "mutable-references", "borrowing", "exclusivity"],
  minDifficulty: 0.2,
  maxDifficulty: 1.45,
  generate(rng, targetDifficulty) {
    const value = rng.pick(["status", "label", "message"]);
    const functionName = rng.pick(["mark_checked", "append_marker", "tag"]);
    const initial = rng.pick(["reviewed", "parsed", "ready"]);
    const marker = rng.pick(["!", "?", "."]);

    return singleChallenge(rng, {
      templateId: this.id,
      track: TRACK,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Two jobs for mut",
      code: code([
        `fn ${functionName}(value: &mut String) {`,
        `    value.push('${marker}');`,
        `}`,
        ``,
        `fn main() {`,
        `    let mut ${value} = String::from("${initial}");`,
        `    ${functionName}(&mut ${value});`,
        `    println!("{${value}}");`,
        `}`,
      ]),
      question: "Why are both the binding and the reference marked mut?",
      interactionType: "multiple-choice",
      answers: [
        {
          id: "binding-and-borrow",
          label: "let mut permits mutation; &mut grants temporary exclusive access",
        },
        {
          id: "atomic",
          label: "The first mut makes the String atomic; the second locks it",
        },
        {
          id: "ownership",
          label: "Both are required to transfer ownership into the function",
        },
        {
          id: "redundant",
          label: "One is redundant; either mut may be removed without a compiler error",
        },
      ],
      correctAnswer: "binding-and-borrow",
      explanation: `let mut ${value} allows the owned String to be mutated. &mut ${value} creates the exclusive mutable borrow required by the &mut String parameter. That borrow is temporary; after its last use, ${value} can be used again.`,
      impact: "No bug is shown. The exclusivity of a mutable reference is a central safety invariant; unsafe code that manufactures overlapping references can violate it and cause undefined behavior.",
      auditorTakeaway: "let mut describes a binding; &mut T describes exclusive borrowed access to a T.",
      findingClass: "language-behavior",
    });
  },
};

export const sliceViewTemplate: ChallengeTemplate = {
  id: "syntax.slice-view.v1",
  track: TRACK,
  concepts: ["syntax", "slices", "borrowing", "ownership"],
  minDifficulty: 0.35,
  maxDifficulty: 1.75,
  generate(rng, targetDifficulty) {
    const parameter = rng.pick(["bytes", "frame", "packet"]);
    const owner = rng.pick(["buffer", "payload", "data"]);
    const prefixLength = rng.int(2, 4);
    const values = Array.from(
      { length: prefixLength + rng.int(1, 3) },
      () => `0x${rng.int(16, 239).toString(16).toUpperCase().padStart(2, "0")}`,
    );

    return singleChallenge(rng, {
      templateId: this.id,
      track: TRACK,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "A view, not a Vec",
      code: code([
        `fn prefix(${parameter}: &[u8]) -> &[u8] {`,
        `    let end = ${parameter}.len().min(${prefixLength});`,
        `    &${parameter}[..end]`,
        `}`,
        ``,
        `fn main() {`,
        `    let ${owner} = vec![${values.join(", ")}];`,
        `    let head = prefix(&${owner});`,
        `    println!("{head:?}");`,
        `}`,
      ]),
      question: "What does the type &[u8] represent?",
      interactionType: "multiple-choice",
      answers: [
        {
          id: "borrowed-slice",
          label: "A borrowed contiguous view carrying a start pointer and length",
        },
        {
          id: "owned-array",
          label: "An owned heap array whose length is fixed at compile time",
        },
        {
          id: "single-byte",
          label: "A shared reference to exactly one u8",
        },
        {
          id: "raw-region",
          label: "An unchecked raw memory region with no lifetime",
        },
      ],
      correctAnswer: "borrowed-slice",
      explanation: `[u8] is a dynamically sized sequence type, and &[u8] is a borrowed slice: a reference to contiguous bytes plus a length. It does not own or copy ${owner}. The returned slice remains tied to the input borrow.`,
      impact: `No bug is shown: min(${prefixLength}) keeps the slice endpoint within the input length. In less careful code, slicing with an invalid range panics even though it remains memory-safe.`,
      auditorTakeaway: "A slice is a bounded borrowed view; always trace both its owner and its checked length.",
      findingClass: "language-behavior",
    });
  },
};

export const questionMarkTemplate: ChallengeTemplate = {
  id: "syntax.question-mark.v1",
  track: TRACK,
  concepts: ["syntax", "option-result", "question-mark", "control-flow"],
  minDifficulty: 0.7,
  maxDifficulty: 2.1,
  generate(rng, targetDifficulty) {
    const resultVariant = rng.bool();
    const functionName = resultVariant
      ? rng.pick(["parse_port", "parse_limit", "parse_count"])
      : rng.pick(["leading_byte", "first_tag", "initial_octet"]);
    const generatedCode = resultVariant
      ? code([
          `fn ${functionName}(text: &str)`,
          `    -> Result<u16, std::num::ParseIntError>`,
          `{`,
          `    let value = text.parse::<u16>()?;`,
          `    Ok(value)`,
          `}`,
        ])
      : code([
          `fn ${functionName}(input: &[u8]) -> Option<u8> {`,
          `    let byte = input.first()?;`,
          `    Some(*byte)`,
          `}`,
        ]);

    return singleChallenge(rng, {
      templateId: this.id,
      track: TRACK,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "The question mark exits early",
      code: generatedCode,
      question: "What does the ? operator do in this function?",
      interactionType: "multiple-choice",
      answers: [
        {
          id: "propagates",
          label: resultVariant
            ? "Ok yields the u16; Err returns early from the function"
            : "Some yields the &u8; None returns early from the function",
        },
        {
          id: "panics",
          label: "It unwraps the value and panics on failure",
        },
        {
          id: "default",
          label: "It replaces a failure with the type's default value",
        },
        {
          id: "async",
          label: "It suspends the function until the value becomes available",
        },
      ],
      correctAnswer: "propagates",
      explanation: resultVariant
        ? "On Ok, ? extracts the u16 and execution continues. On Err, it returns early from the current function with a compatible Err. The ::<u16> syntax supplies the generic target type for parse."
        : "On Some, ? extracts the contained &u8 and execution continues. On None, it returns None from the current function immediately. It does not panic or await anything.",
      impact: "No bug is shown. In audit work, ? is hidden control flow: a failure can skip every later validation, state update, or cleanup step that is not protected by RAII.",
      auditorTakeaway: "Read ? as either continue with the success value or return the failure now.",
      findingClass: "language-behavior",
    });
  },
};

export const explicitLifetimeTemplate: ChallengeTemplate = {
  id: "syntax.explicit-lifetime.v1",
  track: TRACK,
  concepts: ["syntax", "lifetimes", "references", "contracts"],
  minDifficulty: 1.15,
  maxDifficulty: 2.35,
  generate(rng, targetDifficulty) {
    const functionName = rng.pick(["choose", "prefer_primary", "select_label"]);
    const first = rng.pick(["primary", "candidate", "preferred"]);
    const second = rng.pick(["fallback", "default", "alternate"]);

    return singleChallenge(rng, {
      templateId: this.id,
      track: TRACK,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "An apostrophe is a relationship",
      code: code([
        `fn ${functionName}<'a>(`,
        `    ${first}: &'a str,`,
        `    ${second}: &'a str,`,
        `) -> &'a str {`,
        `    if ${first}.is_empty() { ${second} } else { ${first} }`,
        `}`,
      ]),
      question: "What does the lifetime name 'a say about this function?",
      interactionType: "multiple-choice",
      answers: [
        {
          id: "relationship",
          label: "The returned borrow cannot outlive the shorter usable input borrow",
        },
        {
          id: "extends",
          label: "Both input strings are forced to live for the entire program",
        },
        {
          id: "allocation",
          label: "Rust allocates shared storage owned by the lifetime",
        },
        {
          id: "runtime",
          label: "The function performs a runtime check named a",
        },
      ],
      correctAnswer: "relationship",
      explanation: "The caller chooses a lifetime 'a for which both input references are valid, and the returned reference is valid for that same 'a. In practice, the usable return borrow is limited by the shorter overlapping input lifetime. The annotation describes a relationship; it does not extend either value's life.",
      impact: "No bug is shown. Lifetime syntax becomes security-relevant when unsafe code claims a stronger relationship than reality—for example, by extending a borrow or returning a reference after its owner can be dropped.",
      auditorTakeaway: "Lifetimes describe which borrows are related; they never keep storage alive by themselves.",
      findingClass: "language-behavior",
    });
  },
};

export const syntaxVocabularyTemplates: readonly ChallengeTemplate[] = [
  shadowingTemplate,
  sharedReferenceTemplate,
  mutableReferenceTemplate,
  sliceViewTemplate,
  questionMarkTemplate,
  explicitLifetimeTemplate,
] as const;
