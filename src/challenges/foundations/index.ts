import type { ChallengeTemplate } from "../../game/types";
import { boundedDifficulty, code, singleChallenge } from "../shared";

export const moveAfterMoveTemplate: ChallengeTemplate = {
  id: "ownership.move-after-move.v1",
  concepts: ["ownership", "moves-vs-copy", "compiler-errors"],
  minDifficulty: 0.35,
  maxDifficulty: 1.35,
  generate(rng, targetDifficulty) {
    const vector = rng.bool();
    const source = rng.pick(["report", "packet", "token"]);
    const destination = rng.pick(["queued", "saved", "owned"]);
    const value = vector
      ? `vec![0x52_u8, 0x53, 0x54]`
      : `String::from("audit-me")`;
    const type = vector ? "Vec<u8>" : "String";

    return singleChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Consumed evidence",
      code: code([
        `fn queue(${source}: ${type}) {`,
        `    let ${destination} = ${source};`,
        `    println!("queued: {:?}", ${destination});`,
        `    println!("original: {:?}", ${source});`,
        `}`,
        ``,
        `fn main() {`,
        `    queue(${value});`,
        `}`,
      ]),
      question: "What happens when this code is compiled?",
      interactionType: "multiple-choice",
      answers: [
        { id: "moved", label: "Compiler error: the value was moved" },
        { id: "prints-twice", label: "It prints the same value twice" },
        { id: "panic", label: "It compiles, then panics on the second print" },
        { id: "ub", label: "The second print is undefined behavior" },
      ],
      correctAnswer: "moved",
      explanation: `${type} does not implement Copy. Assigning ${source} to ${destination} moves ownership, so the later use of ${source} is rejected at compile time. No executable containing this error is produced.`,
      impact: "This is a compiler error, not a runtime panic, vulnerability, or undefined behavior. The borrow checker prevents the use-after-move.",
      fixedCode: code([
        `fn queue(${source}: ${type}) {`,
        `    let ${destination} = ${source}.clone();`,
        `    println!("queued: {:?}", ${destination});`,
        `    println!("original: {:?}", ${source});`,
        `}`,
        ``,
        `fn main() {`,
        `    queue(${value});`,
        `}`,
      ]),
      auditorTakeaway: "First decide whether suspicious code can compile; do not assign runtime impact to a compiler error.",
      findingClass: "compile-error",
    });
  },
};

export const boundaryIndexTemplate: ChallengeTemplate = {
  id: "foundations.boundary-index.v1",
  concepts: ["indexing", "panics", "untrusted-input", "safe-rust"],
  minDifficulty: 0.75,
  maxDifficulty: 2.4,
  generate(rng, targetDifficulty) {
    const header = rng.int(2, 7);
    const name = rng.pick(["packet_kind", "frame_tag", "message_version"]);
    const parameter = rng.pick(["packet", "frame", "bytes"]);

    return singleChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "One byte past the guard",
      code: code([
        `fn ${name}(${parameter}: &[u8]) -> u8 {`,
        `    const HEADER_LEN: usize = ${header};`,
        `    if ${parameter}.len() < HEADER_LEN {`,
        `        return 0;`,
        `    }`,
        `    ${parameter}[HEADER_LEN]`,
        `}`,
      ]),
      question: "Which attacker-controlled input reaches a panic?",
      interactionType: "breaking-input",
      answers: [
        { id: "exact", label: `A ${header}-byte slice` },
        { id: "short", label: `A ${header - 1}-byte slice` },
        { id: "next", label: `A ${header + 1}-byte slice` },
        { id: "none", label: "No input can panic in safe Rust" },
      ],
      correctAnswer: "exact",
      explanation: `The guard accepts a slice of length ${header}, but index ${header} is the next byte. Valid indices end at ${header - 1}. Rust's bounds check therefore panics.`,
      impact: "If an untrusted request reaches this function and the panic aborts or tears down a worker, it is a denial of service. Bounds-checked safe Rust prevents memory corruption, not panics.",
      fixedCode: code([
        `fn ${name}(${parameter}: &[u8]) -> Option<u8> {`,
        `    ${parameter}.get(${header}).copied()`,
        `}`,
      ]),
      auditorTakeaway: "For index n, prove len > n—not merely len >= n.",
      findingClass: "panic-dos",
    });
  },
};

export const refCellReentrancyTemplate: ChallengeTemplate = {
  id: "foundations.refcell-reentrancy.v1",
  concepts: ["interior-mutability", "reentrancy", "panics", "safe-rust"],
  minDifficulty: 2.3,
  maxDifficulty: 4.4,
  generate(rng, targetDifficulty) {
    const collection = rng.pick(["hooks", "plugins", "listeners"]);

    return singleChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "A safe reentrant callback",
      code: code([
        `struct Registry {`,
        `    ${collection}: RefCell<Vec<String>>,`,
        `}`,
        ``,
        `impl Registry {`,
        `    fn visit(&self, f: impl Fn(&Self)) {`,
        `        let list = self.${collection}.borrow_mut();`,
        `        for _ in list.iter() { f(self); }`,
        `    }`,
        ``,
        `    fn add(&self, name: String) {`,
        `        self.${collection}.borrow_mut().push(name);`,
        `    }`,
        `}`,
      ]),
      question: "What if the callback passed to visit calls add?",
      interactionType: "safety-classification",
      answers: [
        { id: "panic", label: "Safe Rust, but the dynamic borrow check panics" },
        { id: "compile", label: "The borrow checker rejects visit" },
        { id: "ub", label: "Two mutable borrows cause undefined behavior" },
        { id: "works", label: "RefCell queues the second mutable borrow" },
      ],
      correctAnswer: "panic",
      explanation: "visit keeps a RefMut alive while invoking attacker- or plugin-controlled code. Re-entering add requests another mutable borrow, so RefCell detects the conflict at runtime and panics.",
      impact: "The code remains memory-safe. A reachable panic can still become a denial of service or abort the surrounding operation.",
      fixedCode: code([
        `fn visit(&self, f: impl Fn(&Self)) {`,
        `    let count = self.${collection}.borrow().len();`,
        `    for _ in 0..count { f(self); }`,
        `}`,
      ]),
      auditorTakeaway: "Treat callbacks as reentrancy points; release RefCell and lock guards before calling unknown code.",
      findingClass: "panic-dos",
    });
  },
};
