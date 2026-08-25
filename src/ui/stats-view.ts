import {
  getAccuracy,
  getWeakConcepts,
  type PlayerState,
} from "../game/player-state";
import { MAX_UNCERTAINTY, MIN_UNCERTAINTY } from "../game/rating";
import { formatRating } from "../game/rating";
import { getRank } from "../rusty/progression";
import { createDialog, element, formatPercent, slugLabel } from "./dom";

function stat(label: string, value: string): HTMLElement {
  const card = element("div", "stat-card");
  card.append(
    element("span", "stat-card__value", value),
    element("span", "stat-card__label", label),
  );
  return card;
}

export function renderStatsDialog(state: PlayerState): HTMLDialogElement {
  const { dialog, body } = createDialog("Training stats", "stats-title");
  const confidence = 1 -
    (state.uncertainty - MIN_UNCERTAINTY) /
      (MAX_UNCERTAINTY - MIN_UNCERTAINTY);

  const hero = element("section", "stats-hero");
  hero.append(
    element("span", "stats-hero__level", `LEVEL ${formatRating(state.rating)}`),
    element("span", "stats-hero__rank", getRank(state.rating).name),
  );

  const grid = element("div", "stats-grid");
  grid.append(
    stat("Answered", String(state.totalAnswered)),
    stat("Accuracy", formatPercent(getAccuracy(state))),
    stat("Streak", String(state.streak)),
    stat("Calibration", state.calibrationSamples ? formatPercent(state.calibration) : "—"),
    stat("Rating confidence", formatPercent(confidence)),
    stat("Concepts seen", String(Object.keys(state.statsByConcept).length)),
  );

  const recent = element("section", "stats-section");
  recent.append(element("h3", "stats-section__title", "Recent performance"));
  const dots = element("div", "result-dots");
  if (state.recentResults.length === 0) {
    dots.append(element("p", "muted", "Answer a challenge to start the signal."));
  } else {
    state.recentResults.slice(-20).forEach((result, index) => {
      const dot = element(
        "span",
        `result-dot ${result.correct ? "is-correct" : "is-wrong"}`,
      );
      const label = `${result.correct ? "Correct" : "Missed"} challenge ${index + 1} of ${Math.min(20, state.recentResults.length)}, difficulty ${result.difficulty.toFixed(2)}`;
      dot.title = label;
      dot.setAttribute("role", "img");
      dot.setAttribute("aria-label", label);
      dots.append(dot);
    });
  }
  recent.append(dots);

  const conceptsSection = element("section", "stats-section");
  conceptsSection.append(element("h3", "stats-section__title", "Concept proficiency"));
  const conceptRows = element("div", "concept-rows");
  const entries = Object.entries(state.statsByConcept)
    .sort(([, left], [, right]) => right.attempted - left.attempted)
    .slice(0, 10);
  if (entries.length === 0) {
    conceptRows.append(element("p", "muted", "No concept estimates yet."));
  } else {
    for (const [concept, stats] of entries) {
      const row = element("div", "concept-row");
      const labels = element("div", "concept-row__labels");
      labels.append(
        element("span", "concept-row__name", slugLabel(concept)),
        element("span", "concept-row__value", stats.proficiency.toFixed(2)),
      );
      const track = element("div", "mini-progress");
      const fill = element("span", "mini-progress__fill");
      fill.style.width = `${stats.proficiency * 10}%`;
      track.append(fill);
      row.append(labels, track);
      conceptRows.append(row);
    }
  }
  conceptsSection.append(conceptRows);

  const weak = getWeakConcepts(state, 4);
  if (weak.length > 0) {
    const weakSection = element("section", "stats-section");
    weakSection.append(
      element("h3", "stats-section__title", "Recalibration targets"),
      element("p", "muted", weak.map(slugLabel).join(" · ")),
    );
    conceptsSection.append(weakSection);
  }

  if (state.hardestCorrectChallenge) {
    const hardest = element("section", "hardest-card");
    hardest.append(
      element("span", "hardest-card__label", "Hardest solved"),
      element("strong", "hardest-card__title", state.hardestCorrectChallenge.title),
      element(
        "span",
        "hardest-card__difficulty",
        `Difficulty ${state.hardestCorrectChallenge.difficulty.toFixed(2)}`,
      ),
    );
    body.append(hero, grid, recent, conceptsSection, hardest);
  } else {
    body.append(hero, grid, recent, conceptsSection);
  }
  return dialog;
}
