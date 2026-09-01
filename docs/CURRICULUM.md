# Curriculum and technical references

rusty.ninja treats challenge correctness as a security boundary. The v1 curriculum was reviewed against primary Rust, standard-library, Serde, Tokio, and GitHub Pages documentation. A finding is classified by the strongest behavior established by the shown premises:

- **Compiler error:** rustc rejects the code, so no runtime impact is assigned.
- **Rust language behavior:** valid syntax or semantics being taught explicitly;
  no defect or security impact is implied.
- **Logic:** the program executes but violates intended semantics.
- **Panic / DoS:** a reachable panic, deadlock, or resource failure; availability impact requires attacker reachability.
- **Security:** a memory-safe policy, authorization, parsing, or containment failure.
- **Context-dependent:** the shown unsafe or foreign boundary may be sound, but the evidence needed to prove its caller, lifetime, ownership, or concurrency contract is not shown.
- **Undefined behavior:** this execution violates a validity, pointer, aliasing, data-race, or similar unsafe precondition.
- **Unsoundness:** a safe API permits at least one safe caller to trigger undefined behavior.

`unsafe` alone is not a finding, and safe Rust alone is not a security argument. Questions that depend on target width, overflow checks, panic strategy, allocator behavior, operating-system path resolution, executor behavior, or an FFI ownership contract must state or ask for that context.

## Opening track: Rust syntax and vocabulary

Levels 0.0–2.35 preferentially sample six procedural reading exercises before
the game leans hard on vulnerability classification. They cover `let`, `mut`,
shadowing, `&T`, `&mut T`, slices, explicit lifetimes, `Option`, `Result`, and
`?`. These are normal seeded challenges with adaptive rating updates—not a fixed
tutorial or a gate. Correct examples use the **Rust language behavior** class so
the game never invents a logic bug merely to fit its audit taxonomy.

The opening track establishes vocabulary with the same distinctions used later:
a borrow is not a move, a lifetime annotation does not keep storage alive, `?`
does not panic, and a slice is a bounded borrowed view rather than an owned
collection. Missing any opening challenge exposes the relevant official Rust
documentation in feedback.

## Practical code reading

Levels 0.35–5.25 also sample eight procedural exercises in reading normal,
practical Rust. Five ask for the exact printed output and three ask for the best
description of a function's behavior. Every question has four realistic choices;
the distractors reflect common tracing errors rather than intentionally obscure
syntax tricks.

The lane progresses through guarded accumulation, `Vec::retain`, in-place string
normalization, `Option`/`Result` parsing, lazy iterator pipelines,
`HashMap::entry`, clone-and-sort ownership, and lexical `Drop` timing. These are
classified as **Rust language behavior**, not as invented vulnerabilities. They
train the exact execution tracing needed before a reviewer can judge whether a
guard, parser, allocation, or cleanup path is security relevant. Incorrect
answers link to the standard-library, Rust Book, or Rust Reference pages for the
specific components involved.

## Primary references

- [The Rust Programming Language: ownership](https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html)
- [Variables, mutability, and shadowing](https://doc.rust-lang.org/book/ch03-01-variables-and-mutability.html#shadowing)
- [References and borrowing](https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html)
- [The slice type](https://doc.rust-lang.org/book/ch04-03-slices.html)
- [Lifetime annotation syntax](https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html#lifetime-annotation-syntax)
- [Rust Reference: the `?` operator](https://doc.rust-lang.org/reference/expressions/operator-expr.html#the-question-mark-operator)
- [Rust Reference: numeric casts](https://doc.rust-lang.org/reference/expressions/operator-expr.html#numeric-cast)
- [Rust Reference: behavior considered undefined](https://doc.rust-lang.org/reference/behavior-considered-undefined.html)
- [`slice::from_raw_parts` safety contract](https://doc.rust-lang.org/std/slice/fn.from_raw_parts.html)
- [`slice::get_unchecked` safety contract](https://doc.rust-lang.org/std/primitive.slice.html#method.get_unchecked)
- [`Vec::from_raw_parts` safety contract](https://doc.rust-lang.org/std/vec/struct.Vec.html#method.from_raw_parts)
- [`MaybeUninit` initialization invariant](https://doc.rust-lang.org/std/mem/union.MaybeUninit.html#initialization-invariant)
- [`Pin` and self-referential construction](https://doc.rust-lang.org/std/pin/index.html#a-self-referential-struct)
- [Rustonomicon: Send and Sync](https://doc.rust-lang.org/nomicon/send-and-sync.html)
- [Rustonomicon: FFI and unwinding](https://doc.rust-lang.org/nomicon/ffi.html#ffi-and-unwinding)
- [`CString::from_raw`](https://doc.rust-lang.org/std/ffi/struct.CString.html#method.from_raw) and [`CStr::from_ptr`](https://doc.rust-lang.org/std/ffi/struct.CStr.html#method.from_ptr)
- [Serde enum representations](https://serde.rs/enum-representations.html#untagged)
- [Serde container attributes](https://serde.rs/container-attrs.html#serde-deny_unknown_fields)
- [Tokio `select!` cancellation safety](https://docs.rs/tokio/latest/tokio/macro.select.html#cancellation-safety)
- [Tokio shared-state guidance](https://tokio.rs/tokio/tutorial/shared-state)

## Manual difficulty audit

The release review samples stable variants around levels 1, 3, 5, 7, 9, and 10. The expected progression is:

1. distinguish compiler enforcement from runtime impact;
2. derive exact integer or boundary counterexamples;
3. reason about ambiguous parser selection and policy consequences;
4. enumerate independent FFI ownership, pointer, encoding, and unwind contracts;
5. identify when pinning actually begins and why an internal pointer dangles;
6. trace safe deserialization around a constructor into unsafe unchecked indexing, connect all invariant failures, and prioritize the resulting soundness finding.

Generator tests exercise every template at 24 positions across its declared difficulty range and validate answer cardinality and IDs. Every reviewed semantic template is also exercised across all 40 explicit R2 review contexts; coverage checks prove the same 40-fold expansion at every quarter-level from 0 through 10. Dedicated reading-lane tests cover 20 variants of each generator, and golden fingerprints protect every R1 canonical and historical short share seed that predates the lane. An 80-problem engine regression verifies that every sliding window of three generated challenges uses three distinct semantic template IDs. Compile-fail, Miri, architecture, and dependency-version fixtures are appropriate follow-up gates for future templates whose correctness depends on them.
