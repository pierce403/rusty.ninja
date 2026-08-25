import { createRng } from "../game/rng";
import { getRustyStage, type RustyStageLevel } from "./progression";

export type RustyDialogueEvent =
  | "challenge"
  | "correct"
  | "incorrect"
  | "milestone";

type DialogueLibrary = Readonly<
  Record<RustyStageLevel, Readonly<Record<RustyDialogueEvent, readonly string[]>>>
>;

const DIALOGUE: DialogueLibrary = {
  0: {
    challenge: [
      "Could you check this before I install it?",
      "This module says it’s safe. I’d like a second opinion.",
      "My warning light came on when I read this.",
    ],
    correct: [
      "That explains the smoke. Good catch.",
      "I’ll patch that before the next reboot.",
    ],
    incorrect: [
      "Let’s trace the invariant together.",
      "Something still rattles. One more look?",
    ],
    milestone: ["That repair should hold. I think."],
  },
  2: {
    challenge: [
      "I don’t trust this cast. Do you?",
      "The happy path looks clean. What did it forget?",
      "Could an input make this panel come loose again?",
    ],
    correct: ["Nice. Fewer sparks already.", "That closes a sharp edge."],
    incorrect: ["The type changed; did the value survive?", "Let’s follow attacker control first."],
    milestone: ["Diagnostics are finally passing more often than not."],
  },
  4: {
    challenge: [
      "The patch compiles. That isn’t the same as being fixed.",
      "Which assumption is doing the real work here?",
      "This parser is very confident about its length field.",
    ],
    correct: ["Good review. I’ll keep the mismatched panel; it has character."],
    incorrect: ["Plausible code can still have hostile inputs.", "Let’s separate panic from undefined behavior."],
    milestone: ["All major systems are online. Now we make them trustworthy."],
  },
  6: {
    challenge: [
      "The lock is sound. I’m less sure about when we hold it.",
      "Safe on the outside—what invariant reaches the unsafe block?",
      "Let’s review the failure path, not just the return value.",
    ],
    correct: ["Exactly. The boundary is where I’d document it."],
    incorrect: ["Close. Classify the failure mode before its severity.", "What can a safe caller make the unsafe code believe?"],
    milestone: ["I can stand on my own now. Keep reviewing with me."],
  },
  8: {
    challenge: [
      "There may be two findings here, but only one breaks soundness.",
      "What context would you request before assigning severity?",
      "The implementation looks reasonable. Let’s audit the trait contract.",
    ],
    correct: ["Agreed. That’s the finding I’d lead with."],
    incorrect: ["A suspicious unsafe block isn’t automatically the bug.", "Let’s identify the safe caller’s full power."],
    milestone: ["My sensors are hardened. Our threat model should be too."],
  },
  10: {
    challenge: [
      "Peer review? I mapped the ownership boundary, but challenge my model.",
      "Let’s decide what evidence would turn this into a critical finding.",
      "I found a reasonable-looking abstraction. Naturally, I’m suspicious.",
    ],
    correct: ["Same conclusion. Ship the finding, with that caveat."],
    incorrect: ["We disagree. Let’s build the smallest counterexample."],
    milestone: ["You taught me to distrust perfectly reasonable-looking Rust."],
  },
};

/** Stable dialogue selection prevents re-rendering from changing Rusty's line. */
export function getRustyDialogue(
  rating: number,
  seed: string,
  event: RustyDialogueEvent = "challenge",
): string {
  const stage = getRustyStage(rating).level;
  const choices = DIALOGUE[stage][event];
  return createRng(`rusty-dialogue:${stage}:${event}:${seed}`).pick(choices);
}
