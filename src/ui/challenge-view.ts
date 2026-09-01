import type {
  AnswerConfidence,
  Challenge,
  GradeResult,
} from "../game/types";
import { interactionLabel } from "../challenges/shared";
import { getOfficialReferencesForFeedback } from "../challenges/references";
import { button, element, formatDelta, renderCode, slugLabel } from "./dom";

export interface FeedbackState {
  readonly grade: GradeResult;
  readonly ratingDelta: number;
  readonly replay: boolean;
}

export interface ChallengeViewOptions {
  readonly challenge: Challenge;
  readonly confidence: AnswerConfidence;
  readonly selected: ReadonlySet<string>;
  readonly feedback: FeedbackState | null;
  readonly onConfidence: (confidence: AnswerConfidence) => void;
  readonly onAnswer: (answerId: string) => void;
  readonly onSubmit: () => void;
  readonly onNext: () => void;
  readonly onShare: () => void;
}

const CONFIDENCE_OPTIONS: readonly {
  value: AnswerConfidence;
  label: string;
}[] = [
  { value: "guess", label: "Guess" },
  { value: "pretty-sure", label: "Pretty sure" },
  { value: "certain", label: "Certain" },
];

const FINDING_LABELS = {
  "language-behavior": "Rust language behavior",
  "compile-error": "Compiler error",
  logic: "Logic bug",
  "panic-dos": "Panic / DoS",
  security: "Security vulnerability",
  "context-dependent": "Context-dependent",
  unsoundness: "Unsound safe abstraction",
  "undefined-behavior": "Undefined behavior",
} as const;

function renderLearningTrack(challenge: Challenge): HTMLElement | null {
  const details = challenge.track === "syntax-vocabulary"
    ? {
        eyebrow: "Opening track",
        title: "Rust syntax & vocabulary",
        copy: "Decode the notation first: bindings, borrows, slices, lifetimes, and error flow.",
      }
    : challenge.track === "code-reading"
      ? {
          eyebrow: "Practical track",
          title: "Read the code",
          copy: "Trace ordinary Rust from inputs to effects, then choose the behavior or exact output.",
        }
      : null;
  if (!details) return null;

  const track = element("aside", "learning-track");
  track.append(
    element("span", "learning-track__eyebrow", details.eyebrow),
    element("strong", "learning-track__title", details.title),
    element("p", "learning-track__copy", details.copy),
  );
  return track;
}

function renderConfidence(options: ChallengeViewOptions): HTMLElement {
  const fieldset = element("fieldset", "confidence");
  fieldset.disabled = options.feedback !== null;
  const legend = element("legend", "confidence__label", "How sure are you?");
  const group = element("div", "segmented");

  for (const option of CONFIDENCE_OPTIONS) {
    const control = button(
      `segmented__button${option.value === options.confidence ? " is-active" : ""}`,
      option.label,
      () => options.onConfidence(option.value),
    );
    control.setAttribute("aria-pressed", String(option.value === options.confidence));
    group.append(control);
  }

  fieldset.append(legend, group);
  return fieldset;
}

function renderAnswers(options: ChallengeViewOptions): HTMLElement {
  const answers = element("div", "answers");
  answers.setAttribute("role", "group");
  answers.setAttribute("aria-label", "Answer choices");

  options.challenge.answers.forEach((answer, index) => {
    const selected = options.selected.has(answer.id);
    const correct = options.feedback?.grade.correctAnswerIds.includes(answer.id) ?? false;
    const incorrectlySelected = Boolean(options.feedback && selected && !correct);
    const classes = ["answer"];
    if (selected) classes.push("is-selected");
    if (options.feedback && correct) classes.push("is-correct");
    if (incorrectlySelected) classes.push("is-wrong");

    const control = element("button", classes.join(" "));
    control.type = "button";
    control.disabled = options.feedback !== null;
    control.dataset.answerId = answer.id;
    control.setAttribute("aria-pressed", String(selected));
    const statusText = options.feedback
      ? correct
        ? selected
          ? "Correct"
          : "Correct answer"
        : incorrectlySelected
          ? "Your answer — incorrect"
          : null
      : null;
    control.setAttribute(
      "aria-label",
      statusText ? `${answer.label}. ${statusText}.` : answer.label,
    );
    const number = element("span", "answer__index", String(index + 1));
    number.setAttribute("aria-hidden", "true");
    const label = element("span", "answer__label", answer.label);
    control.append(number, label);
    if (statusText) {
      control.append(element("span", "answer__status", statusText));
    }
    control.addEventListener("click", () => options.onAnswer(answer.id));
    answers.append(control);
  });

  if (options.challenge.interactionType === "find-all" && !options.feedback) {
    const submit = button("primary-button answer-submit", "Check findings", options.onSubmit);
    submit.disabled = options.selected.size === 0;
    answers.append(submit);
  }

  return answers;
}

function renderFeedback(options: ChallengeViewOptions): HTMLElement {
  const feedback = options.feedback as FeedbackState;
  const card = element(
    "section",
    `feedback ${feedback.grade.correct ? "feedback--correct" : "feedback--incorrect"}`,
  );
  card.tabIndex = -1;
  card.dataset.feedback = "true";
  card.setAttribute("aria-live", "polite");

  const resultRow = element("div", "feedback__result-row");
  const resultCopy = element("div");
  const eyebrow = element(
    "p",
    "feedback__eyebrow",
    feedback.replay ? "Replay" : feedback.grade.correct ? "Correct" : "Not quite",
  );
  const heading = element(
    "h2",
    "feedback__heading",
    FINDING_LABELS[options.challenge.findingClass],
  );
  resultCopy.append(eyebrow, heading);
  const delta = element(
    "span",
    "feedback__delta",
    feedback.replay ? "No rating change" : formatDelta(feedback.ratingDelta),
  );
  resultRow.append(resultCopy, delta);

  const explanation = element("p", "feedback__copy", options.challenge.explanation);
  const impactHeading = element("h3", "feedback__subheading", "Impact");
  const impact = element("p", "feedback__copy", options.challenge.impact);
  card.append(resultRow, explanation, impactHeading, impact);

  if (options.challenge.fixedCode) {
    const fixHeading = element("h3", "feedback__subheading", "Safer version");
    card.append(fixHeading, renderCode(options.challenge.fixedCode, true));
  }

  const references = getOfficialReferencesForFeedback(
    options.challenge.templateId,
    feedback.grade.correct,
  );
  if (references.length > 0) {
    const documentation = element("section", "official-docs");
    documentation.setAttribute("aria-labelledby", "official-docs-heading");
    const docsHeading = element(
      "h3",
      "feedback__subheading official-docs__heading",
      "Official documentation",
    );
    docsHeading.id = "official-docs-heading";
    const docsList = element("ul", "official-docs__list");

    for (const reference of references) {
      const item = element("li", "official-docs__item");
      const link = element("a", "official-docs__link");
      link.href = reference.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const arrow = element("span", "official-docs__arrow", "↗");
      arrow.setAttribute("aria-hidden", "true");
      link.append(
        element("span", "official-docs__source", reference.source),
        element("span", "official-docs__title", reference.title),
        arrow,
      );
      item.append(link);
      docsList.append(item);
    }

    documentation.append(docsHeading, docsList);
    card.append(documentation);
  }

  const instinct = element("aside", "instinct");
  instinct.append(
    element("span", "instinct__label", "Auditor instinct"),
    element("p", "instinct__copy", options.challenge.auditorTakeaway),
  );
  const next = button("primary-button next-button", "Next challenge", options.onNext);
  next.dataset.next = "true";
  card.append(instinct, next);
  return card;
}

export function renderChallengeView(options: ChallengeViewOptions): HTMLElement {
  const section = element("section", "challenge-panel");
  const top = element("div", "challenge-panel__top");
  const titleGroup = element("div");
  const kicker = element(
    "p",
    "challenge-panel__kicker",
    `${interactionLabel(options.challenge.interactionType)} · Difficulty ${options.challenge.difficulty.toFixed(2)}`,
  );
  const title = element("h1", "challenge-panel__title", options.challenge.title);
  titleGroup.append(kicker, title);
  if (options.challenge.caseVariant) {
    const caseVariant = options.challenge.caseVariant;
    titleGroup.append(element(
      "p",
      "challenge-panel__case",
      `Case ${caseVariant.index + 1}/${caseVariant.total} · ${caseVariant.label} · ${caseVariant.sourcePath}`,
    ));
  }
  const share = button("ghost-button share-button", "Share", options.onShare);
  share.setAttribute("aria-label", "Share this seeded challenge");
  top.append(titleGroup, share);

  const concepts = element("div", "concepts", "");
  options.challenge.concepts.slice(0, 4).forEach((concept) => {
    concepts.append(element("span", "concept-chip", slugLabel(concept)));
  });

  const question = element("h2", "challenge-question", options.challenge.question);
  section.append(top);
  const learningTrack = renderLearningTrack(options.challenge);
  if (learningTrack) section.append(learningTrack);
  section.append(concepts, renderCode(options.challenge.code), question);

  if (!options.feedback) section.append(renderConfidence(options));
  section.append(renderAnswers(options));
  if (options.feedback) section.append(renderFeedback(options));
  return section;
}
