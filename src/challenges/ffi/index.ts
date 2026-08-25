import type { ChallengeTemplate } from "../../game/types";
import { boundedDifficulty, code, multiChallenge, singleChallenge } from "../shared";

export const cStringOwnershipTemplate: ChallengeTemplate = {
  id: "ffi.cstring-ownership.v1",
  concepts: ["ffi", "c-strings", "allocator-mismatch", "panic-boundaries"],
  minDifficulty: 6.4,
  maxDifficulty: 8.4,
  generate(rng, targetDifficulty) {
    const functionName = rng.pick(["ingest_name", "audit_label", "record_path"]);

    return multiChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Who owns this C string?",
      code: code([
        `// C may pass null or a NUL-terminated string allocated with malloc.`,
        `pub unsafe extern "C" fn ${functionName}(ptr: *mut c_char) {`,
        `    let owned = unsafe { CString::from_raw(ptr) };`,
        `    let text = owned.to_str().unwrap();`,
        `    audit(text);`,
        `}`,
      ]),
      question: "Select every independent boundary problem in the shown function.",
      interactionType: "find-all",
      answers: [
        { id: "allocator", label: "from_raw requires a pointer previously returned by CString::into_raw" },
        { id: "pointer", label: "Null, unreadable, or non-NUL-terminated input violates pointer/string preconditions" },
        { id: "panic", label: "Invalid UTF-8 can panic; panic crossing non-unwind C ABI aborts" },
        { id: "repr", label: "CString itself needs #[repr(C)]" },
        { id: "unsafe-magic", label: "Marking the function unsafe validates foreign input automatically" },
      ],
      correctAnswer: ["allocator", "pointer", "panic"],
      explanation: "CString::from_raw retakes ownership only from CString::into_raw; malloc, static, or borrowed memory has the wrong deallocator/ownership. CStr::from_ptr is the borrowing API, but still requires a valid non-null NUL-terminated string. to_str may reject arbitrary bytes, and unwrap must not escape through extern C.",
      impact: "Bad ownership can corrupt the allocator or double-free. Bad pointers can cause UB. Invalid UTF-8 can terminate the process through the non-unwind ABI boundary.",
      fixedCode: code([
        `pub unsafe extern "C" fn ${functionName}(ptr: *const c_char) -> c_int {`,
        `    if ptr.is_null() { return ERR_NULL; }`,
        `    let bytes = unsafe { CStr::from_ptr(ptr) }.to_bytes();`,
        `    let Ok(text) = str::from_utf8(bytes) else { return ERR_UTF8; };`,
        `    audit_without_panicking(text);`,
        `    OK`,
        `}`,
      ]),
      auditorTakeaway: "At FFI, separate pointer validity, lifetime, ownership, allocator, encoding, and unwind contracts.",
      findingClass: "undefined-behavior",
    });
  },
};

export const callbackLifetimeTemplate: ChallengeTemplate = {
  id: "ffi.callback-lifetime.v1",
  concepts: ["ffi", "callbacks", "lifetimes", "foreign-threads", "use-after-free"],
  minDifficulty: 7.7,
  maxDifficulty: 9.3,
  generate(rng, targetDifficulty) {
    const owner = rng.pick(["Client", "Scanner", "Runtime"]);
    const install = rng.pick(["register_callback", "set_listener", "install_hook"]);

    return singleChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "A callback outlives its context",
      code: code([
        `struct ${owner} { state: Box<State> }`,
        ``,
        `impl ${owner} {`,
        `    fn start(&mut self) {`,
        `        unsafe {`,
        `            ${install}(`,
        `                on_event,`,
        `                (&mut *self.state as *mut State).cast(),`,
        `            );`,
        `        }`,
        `    }`,
        `}`,
        ``,
        `unsafe extern "C" fn on_event(ctx: *mut c_void) {`,
        `    let state = unsafe { &mut *ctx.cast::<State>() };`,
        `    state.events += 1;`,
        `}`,
      ]),
      question: "What must you inspect next before deciding whether this is sound?",
      interactionType: "inspect-next",
      answers: [
        { id: "lifecycle", label: `Whether callbacks can run after ${owner} drops, on which threads, and how unregister synchronizes` },
        { id: "boxing", label: "Whether Box uses stack or heap allocation on this target" },
        { id: "mangling", label: "Whether on_event has a stable Rust symbol name" },
        { id: "copy", label: "Whether c_void implements Copy" },
      ],
      correctAnswer: "lifecycle",
      explanation: `The raw pointer remains numerically stable while the Box lives, but Rust's lifetime is not carried through C. If foreign code calls after ${owner} drops, or concurrently calls a function that creates another &mut State, on_event creates a dangling or aliased mutable reference.`,
      impact: "Depending on the foreign callback contract, this can be a use-after-free, data race, or sound implementation. The missing lifecycle evidence is the audit blocker.",
      fixedCode: code([
        `// Own callback state in an Arc with thread-safe interior state,`,
        `// retain one strong reference for the foreign registration,`,
        `// unregister in Drop, wait for in-flight callbacks, then release`,
        `// that reference using an explicitly paired FFI operation.`,
      ]),
      auditorTakeaway: "A raw callback context needs an explicit lifetime and concurrency protocol on both sides of the ABI.",
      findingClass: "context-dependent",
    });
  },
};
