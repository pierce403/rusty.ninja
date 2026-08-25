# Contributing to rusty.ninja

Thanks for helping make Rust security practice more useful. Challenge correctness is the release gate: a smaller set of dependable generators is better than a large set of plausible-sounding questions.

## Development workflow

1. Use Node.js 24 and install dependencies with `npm install`.
2. Keep generators deterministic and changes narrowly scoped.
3. Add or update tests alongside behavior.
4. Run `npm test`, `npm run typecheck`, and `npm run build` before opening a pull request.
5. Describe the randomized branches you inspected and include stable challenge seeds that demonstrate the change.

## Challenge correctness standard

Every challenge must make each of these points unambiguous:

- Does the shown code compile? If not, on which supported compiler assumptions does that conclusion depend?
- Is the behavior debug/release or target-architecture dependent?
- Is the finding a compiler error, logic bug, reachable panic, denial of service, security vulnerability, undefined behavior, or an unsound safe abstraction?
- What attacker control and surrounding invariants are required for impact?
- Does the proposed patch remove the root cause, or merely one triggering input?
- Are all distractors genuinely incorrect rather than merely less preferred?

Do not equate `unsafe` with vulnerability, or safe Rust with security. An unsafe block can be sound; safe code can contain serious authorization, availability, parsing, state-machine, and resource-exhaustion flaws. An unsound safe API is distinct from a call that already triggers undefined behavior.

For unsafe code, aliasing, provenance, validity, variance, pinning, `Send`/`Sync`, FFI, or concurrency claims, cite primary technical material in the pull request and add the smallest useful executable fixture. Prefer the Rust Reference, standard-library documentation, the Rustonomicon, accepted RFCs, compiler tests, and relevant Unsafe Code Guidelines material. Miri is useful supporting evidence, but a clean Miri run is not proof that code is sound.

Plausible-sounding but technically uncertain questions must not be merged. If the answer depends on an unsettled memory-model detail, either state that dependency precisely and ask a context question, or choose a better-established example.

## Generator requirements

- Use the engine's seeded RNG exclusively. The same seed, template version, and target difficulty must generate byte-for-byte equivalent challenge content.
- Keep generated difficulty within the template's declared bounds.
- Give every answer a stable, unique ID.
- Single-choice formats must have exactly one correct answer. Multi-select formats must define the complete correct set.
- Exercise every randomized variant in tests, not just one friendly seed.
- Keep ordinary mobile snippets concise; longer high-level review scenarios should earn their length.
- Randomize surface details only when semantics remain trustworthy. Do not add dubious edge cases for variety.
- Mark harmless suspicious code as a red herring deliberately, and explain why it is harmless in context.
- Include the exact failure mode, security impact, a real fix where useful, and a concise auditor instinct.

When Rust behavior differs across integer-overflow settings, panic strategy, targets, compiler versions, operating systems, allocators, or foreign ABIs, encode the relevant assumption in the challenge rather than silently choosing one.

## Difficulty and curriculum

Difficulty should reflect the reasoning required, not how obscure the trivia is. Lower-level challenges can isolate a single concept. Levels 8–10 should increasingly require interacting invariants, review of safe wrappers over unsafe internals, severity judgment, or identification of missing audit context.

Avoid templates that reward keyword spotting. A strong challenge teaches a reusable review habit and has a defensible place in a real Rust audit or security interview.

## User experience and accessibility

Preserve one-handed mobile use, large tap targets, visible focus states, adequate contrast, keyboard operation, and `prefers-reduced-motion`. Do not introduce a network requirement into challenge generation or progress storage.
