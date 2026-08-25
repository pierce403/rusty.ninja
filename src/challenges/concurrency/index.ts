import type { ChallengeTemplate } from "../../game/types";
import { boundedDifficulty, code, singleChallenge } from "../shared";

export const mutexAcrossAwaitTemplate: ChallengeTemplate = {
  id: "concurrency.mutex-await-reentrance.v1",
  concepts: ["async", "mutex", "deadlocks", "raii", "liveness"],
  minDifficulty: 5.0,
  maxDifficulty: 7.3,
  generate(rng, targetDifficulty) {
    const state = rng.pick(["cache", "session", "index"]);
    const action = rng.pick(["publish", "snapshot", "notify"]);

    return singleChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Awaiting the lock you still own",
      code: code([
        `type Shared = Arc<tokio::sync::Mutex<State>>;`,
        ``,
        `async fn refresh(${state}: Shared) -> Result<(), Error> {`,
        `    let mut guard = ${state}.lock().await;`,
        `    guard.loading = true;`,
        `    fetch_remote().await?;`,
        `    ${action}(${state}.clone()).await;`,
        `    guard.loading = false;`,
        `    Ok(())`,
        `}`,
        ``,
        `async fn ${action}(${state}: Shared) {`,
        `    let guard = ${state}.lock().await;`,
        `    send_state(&guard).await;`,
        `}`,
      ]),
      question: `What is the primary failure when refresh reaches ${action}?`,
      interactionType: "severity-classification",
      answers: [
        { id: "deadlock", label: "Memory-safe deadlock/liveness DoS" },
        { id: "race", label: "Undefined behavior from a data race" },
        { id: "poison", label: "The Tokio mutex becomes poisoned" },
        { id: "compile", label: "Compiler error: async functions cannot lock mutexes" },
      ],
      correctAnswer: "deadlock",
      explanation: `${action} waits for the same non-reentrant Tokio mutex whose guard is still held by refresh. refresh cannot drop the guard until ${action} returns, so neither can make progress. Tokio's async mutex is memory-safe and does not use poisoning.`,
      impact: "A reachable request can hang the operation and exhaust tasks or capacity. Holding a lock across fetch_remote also serializes unrelated work even before the self-deadlock.",
      fixedCode: code([
        `{`,
        `    let mut guard = ${state}.lock().await;`,
        `    guard.loading = true;`,
        `} // guard dropped before either await`,
        `let fetched = fetch_remote().await;`,
        `{`,
        `    let mut guard = ${state}.lock().await;`,
        `    guard.loading = false;`,
        `}`,
        `fetched?;`,
        `${action}(${state}.clone()).await;`,
        ``,
        `async fn ${action}(${state}: Shared) {`,
        `    let snapshot = {`,
        `        ${state}.lock().await.snapshot()`,
        `    }; // guard dropped before network I/O`,
        `    send_state(&snapshot).await;`,
        `}`,
      ]),
      auditorTakeaway: "Draw guard lifetimes across every await, including awaited helpers that may reacquire the lock.",
      findingClass: "panic-dos",
    });
  },
};

export const atomicPublicationTemplate: ChallengeTemplate = {
  id: "concurrency.atomic-publication.v1",
  concepts: ["atomics", "memory-ordering", "logical-races", "concurrency"],
  minDifficulty: 6.1,
  maxDifficulty: 8.2,
  generate(rng, targetDifficulty) {
    const data = rng.pick(["CONFIG", "SESSION_ID", "KEY_VERSION"]);
    const ready = rng.pick(["READY", "PUBLISHED", "INITIALIZED"]);
    const value = rng.pick([7, 42, 9001]);

    return singleChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "The flag that publishes nothing",
      code: code([
        `static ${data}: AtomicU64 = AtomicU64::new(0);`,
        `static ${ready}: AtomicBool = AtomicBool::new(false);`,
        ``,
        `fn producer() {`,
        `    ${data}.store(${value}, Ordering::Relaxed);`,
        `    ${ready}.store(true, Ordering::Relaxed);`,
        `}`,
        ``,
        `fn consumer() -> Option<u64> {`,
        `    if ${ready}.load(Ordering::Relaxed) {`,
        `        Some(${data}.load(Ordering::Relaxed))`,
        `    } else {`,
        `        None`,
        `    }`,
        `}`,
      ]),
      question: "Which minimal ordering change makes the flag publish the earlier store?",
      interactionType: "patch-selection",
      answers: [
        { id: "release-acquire", label: `Store ${ready} with Release; load ${ready} with Acquire` },
        { id: "data-seqcst", label: `Make only the ${data} store SeqCst` },
        { id: "fence-after", label: "Add a Relaxed fence after the consumer load" },
        { id: "none", label: "No change; two atomics always become visible in source order" },
      ],
      correctAnswer: "release-acquire",
      explanation: `Relaxed operations are atomic but do not establish the cross-thread synchronization needed to publish earlier operations. A Release store to ${ready} observed by an Acquire load makes the preceding ${data} store happen-before the later load.`,
      impact: "The consumer may observe the ready flag but stale data, producing a logical/security state race. Because both locations are atomic, the shown issue is not a Rust data race or UB.",
      fixedCode: code([
        `${data}.store(${value}, Ordering::Relaxed);`,
        `${ready}.store(true, Ordering::Release);`,
        ``,
        `if ${ready}.load(Ordering::Acquire) {`,
        `    Some(${data}.load(Ordering::Relaxed))`,
        `} else { None }`,
      ]),
      auditorTakeaway: "Atomicity prevents torn access; ordering carries the publication invariant.",
      findingClass: "logic",
    });
  },
};

export const cancelledReadTemplate: ChallengeTemplate = {
  id: "concurrency.cancelled-read-exact.v1",
  concepts: ["async", "cancellation-safety", "parsing", "state-machines"],
  minDifficulty: 6.6,
  maxDifficulty: 8.7,
  generate(rng, targetDifficulty) {
    const width = rng.pick([4, 8, 16]);
    const event = rng.pick(["heartbeat", "maintenance_tick", "metrics_tick"]);

    return singleChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Cancelled halfway through a frame",
      code: code([
        `async fn next_header(stream: &mut TcpStream, tick: &mut Interval)`,
        `    -> io::Result<[u8; ${width}]>`,
        `{`,
        `    let mut header = [0u8; ${width}];`,
        `    loop {`,
        `        tokio::select! {`,
        `            result = stream.read_exact(&mut header) => {`,
        `                result?;`,
        `                return Ok(header);`,
        `            }`,
        `            _ = tick.tick() => ${event}(),`,
        `        }`,
        `    }`,
        `}`,
      ]),
      question: "What property must you inspect before treating this retry loop as correct?",
      interactionType: "inspect-next",
      answers: [
        { id: "cancel", label: "Whether read_exact can consume bytes before its future is cancelled" },
        { id: "send", label: "Whether [u8; N] implements Send" },
        { id: "poison", label: "Whether TcpStream uses mutex poisoning" },
        { id: "drop", label: "Whether arrays run an async destructor" },
      ],
      correctAnswer: "cancel",
      explanation: "Tokio documents read_exact as not cancellation-safe in select!. If it consumes part of the header and the tick branch wins, dropping the future loses that progress while the stream cursor remains advanced. The next iteration reads a new full header from the middle of the frame.",
      impact: "The connection becomes desynchronized. Depending on the framed protocol, that can cause request confusion, authentication bypass conditions, or a forced disconnect.",
      fixedCode: code([
        `let mut header = [0u8; ${width}];`,
        `let mut filled = 0;`,
        `while filled < header.len() {`,
        `    tokio::select! {`,
        `        result = stream.read(&mut header[filled..]) => {`,
        `            let n = result?;`,
        `            if n == 0 { return Err(ErrorKind::UnexpectedEof.into()); }`,
        `            filled += n;`,
        `        }`,
        `        _ = tick.tick() => ${event}(),`,
        `    }`,
        `}`,
        `Ok(header)`,
      ]),
      auditorTakeaway: "At every cancellable await, identify both consumed external state and retained local progress.",
      findingClass: "logic",
    });
  },
};
