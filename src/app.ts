import { challengeTemplates } from "./challenges/registry";
import { ChallengeEngine, ChallengeGenerationError } from "./game/engine";
import {
  MAX_IMPORT_BYTES,
  exportPlayerState,
  hasGradedChallenge,
  importPlayerState,
  loadPlayerState,
  recordChallengeResult,
  resetPlayerState,
  savePlayerState,
  setCurrentChallenge,
  setCurrentChallengeSession,
  type PlayerState,
} from "./game/player-state";
import { formatRating } from "./game/rating";
import { buildShareUrl, parseHashRoute } from "./game/routing";
import type { AnswerConfidence, Challenge } from "./game/types";
import { getRustyDialogue } from "./rusty/dialogue";
import { getRank, getRustyProgression } from "./rusty/progression";
import {
  renderChallengeView,
  type FeedbackState,
} from "./ui/challenge-view";
import { button, element } from "./ui/dom";
import { renderSettingsDialog } from "./ui/settings-view";
import { renderStatsDialog } from "./ui/stats-view";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type DeferredDialog = "stats" | "settings" | null;

function isStandalone(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true;
}

function avifFor(webp: string): string {
  return webp.replace(/\.webp$/, ".avif");
}

export class RustyNinjaApp {
  readonly #root: HTMLElement;
  readonly #engine = new ChallengeEngine(challengeTemplates);
  #state: PlayerState;
  #challenge!: Challenge;
  #selected = new Set<string>();
  #confidence: AnswerConfidence = "pretty-sure";
  #feedback: FeedbackState | null = null;
  #installPrompt: BeforeInstallPromptEvent | null = null;
  #online = navigator.onLine;
  #deferredDialog: DeferredDialog = null;

  public constructor(root: HTMLElement) {
    this.#root = root;
    this.#state = loadPlayerState();
  }

  public start(): void {
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      this.#installPrompt = event as BeforeInstallPromptEvent;
      this.#render();
    });
    window.addEventListener("appinstalled", () => {
      this.#installPrompt = null;
      this.#render();
      this.#toast("Rusty Ninja installed");
    });
    window.addEventListener("online", () => {
      this.#online = true;
      this.#updateNetworkPill();
    });
    window.addEventListener("offline", () => {
      this.#online = false;
      this.#updateNetworkPill();
    });
    window.addEventListener("hashchange", () => this.#handleHashChange());
    window.addEventListener("keydown", (event) => this.#handleKeyboard(event));

    this.#loadInitialChallenge();
  }

  #loadInitialChallenge(): void {
    const route = parseHashRoute(window.location.hash);
    let seed: string | null = null;

    if (route.kind === "challenge") seed = route.seed;
    else if (this.#state.currentSeed) seed = this.#state.currentSeed;
    if (route.kind === "stats" || route.kind === "settings") {
      this.#deferredDialog = route.kind;
    }

    try {
      this.#challenge = seed
        ? this.#engine.fromSeed(seed)
        : this.#engine.next(this.#state);
    } catch (error) {
      this.#challenge = this.#engine.next(this.#state);
      queueMicrotask(() => this.#toast(this.#challengeError(error)));
      history.replaceState(null, "", "#/");
    }

    this.#state = setCurrentChallenge(this.#state, this.#challenge.seed);
    this.#restoreCurrentSession();
    const saved = savePlayerState(this.#state);
    this.#render();
    this.#warnIfNotSaved(saved);
  }

  #restoreCurrentSession(): void {
    const session = this.#state.currentSession;
    if (!session || session.seed !== this.#challenge.seed) {
      this.#selected.clear();
      this.#confidence = "pretty-sure";
      this.#feedback = null;
      return;
    }

    const validAnswerIds = new Set(this.#challenge.answers.map((answer) => answer.id));
    const selected = session.selectedAnswerIds.filter((id) => validAnswerIds.has(id));
    this.#selected = new Set(selected);
    this.#confidence = session.confidence;
    if (!session.feedback || selected.length === 0) {
      this.#feedback = null;
      return;
    }

    const submission = this.#challenge.interactionType === "find-all"
      ? selected
      : selected[0] as string;
    const canonicalGrade = this.#engine.grade(this.#challenge, submission);
    this.#feedback = {
      grade: canonicalGrade,
      ratingDelta: session.feedback.ratingDelta,
      replay: session.feedback.replay,
    };
  }

  #persistCurrentSession(): boolean {
    this.#state = setCurrentChallengeSession(this.#state, {
      seed: this.#challenge.seed,
      confidence: this.#confidence,
      selectedAnswerIds: [...this.#selected],
      feedback: this.#feedback,
    });
    return savePlayerState(this.#state);
  }

  #warnIfNotSaved(saved: boolean): void {
    if (!saved) this.#toast("Progress could not be saved on this device", 5000);
  }

  #handleHashChange(): void {
    const route = parseHashRoute(window.location.hash);
    if (route.kind === "challenge" && route.seed !== this.#challenge.seed) {
      try {
        this.#challenge = this.#engine.fromSeed(route.seed);
        this.#state = setCurrentChallenge(this.#state, route.seed);
        this.#restoreCurrentSession();
        const saved = savePlayerState(this.#state);
        this.#render({ focusTitle: true });
        this.#warnIfNotSaved(saved);
      } catch (error) {
        this.#toast(this.#challengeError(error));
        history.replaceState(null, "", "#/");
      }
    } else if (route.kind === "stats") {
      this.#openStats();
    } else if (route.kind === "settings") {
      this.#openSettings();
    }
  }

  #challengeError(error: unknown): string {
    if (error instanceof ChallengeGenerationError) {
      return "That challenge seed is unavailable in this version.";
    }
    return "Could not reproduce that challenge.";
  }

  #chooseAnswer(answerId: string): void {
    if (this.#feedback) return;

    if (this.#challenge.interactionType === "find-all") {
      if (this.#selected.has(answerId)) this.#selected.delete(answerId);
      else this.#selected.add(answerId);
      const saved = this.#persistCurrentSession();
      this.#render({ focusAnswer: answerId });
      this.#warnIfNotSaved(saved);
      return;
    }

    this.#selected = new Set([answerId]);
    this.#grade();
  }

  #grade(): void {
    if (this.#feedback || this.#selected.size === 0) return;
    const submission = this.#challenge.interactionType === "find-all"
      ? [...this.#selected]
      : ([...this.#selected][0] as string);
    const grade = this.#engine.grade(this.#challenge, submission);
    const replay = hasGradedChallenge(this.#state, this.#challenge.seed);
    const oldRating = this.#state.rating;

    if (!replay) {
      this.#state = recordChallengeResult(this.#state, this.#challenge, {
        correct: grade.correct,
        confidence: this.#confidence,
      });
    }

    this.#feedback = {
      grade,
      ratingDelta: this.#state.rating - oldRating,
      replay,
    };
    const saved = this.#persistCurrentSession();
    this.#render({ focusFeedback: true });
    this.#warnIfNotSaved(saved);
  }

  #nextChallenge(): void {
    this.#challenge = this.#engine.next(this.#state);
    this.#state = setCurrentChallenge(this.#state, this.#challenge.seed);
    const saved = savePlayerState(this.#state);
    this.#selected.clear();
    this.#feedback = null;
    this.#confidence = "pretty-sure";
    history.replaceState(null, "", "#/");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    this.#render({ focusTitle: true });
    this.#warnIfNotSaved(saved);
  }

  async #shareChallenge(): Promise<void> {
    const url = buildShareUrl(this.#challenge.seed);
    const data = {
      title: `rusty.ninja · ${this.#challenge.title}`,
      text: `Can you audit this difficulty ${this.#challenge.difficulty.toFixed(2)} Rust challenge?`,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(url);
        this.#toast("Challenge link copied");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        this.#toast("Challenge link copied");
      } catch {
        this.#toast(url, 6000);
      }
    }
  }

  #renderRusty(): HTMLElement {
    const progression = getRustyProgression(this.#state.rating);
    const rank = getRank(this.#state.rating);
    const event = this.#feedback
      ? this.#feedback.grade.correct ? "correct" : "incorrect"
      : "challenge";
    const dialogue = getRustyDialogue(
      this.#state.rating,
      this.#challenge.seed,
      event,
    );
    const card = element("section", "rusty-card");
    const art = element("div", "rusty-card__art");
    const picture = element("picture");
    const source = element("source");
    source.type = "image/avif";
    source.srcset = avifFor(progression.stage.asset);
    const image = element("img", "rusty-image");
    image.src = progression.stage.asset;
    image.alt = progression.stage.alt;
    image.width = 512;
    image.height = 512;
    image.decoding = "async";
    picture.append(source, image);
    art.append(picture);

    const info = element("div", "rusty-card__info");
    const levelRow = element("div", "level-row");
    levelRow.append(
      element("span", "level-value", `LVL ${formatRating(this.#state.rating)}`),
      element("span", "rank-name", rank.name),
    );
    const track = element("div", "level-track");
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", "Rust security skill level");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "10");
    track.setAttribute("aria-valuenow", this.#state.rating.toFixed(3));
    const fill = element("span", "level-track__fill");
    fill.style.width = `${this.#state.rating * 10}%`;
    track.append(fill);
    const condition = element("p", "rusty-condition", progression.stage.condition);
    const speech = element("blockquote", "rusty-dialogue", dialogue);
    info.append(levelRow, track, condition, speech);
    card.append(art, info);
    return card;
  }

  #renderHeader(): HTMLElement {
    const header = element("header", "app-header");
    const brand = element("a", "brand", "rusty.ninja");
    brand.href = "#/";
    brand.setAttribute("aria-label", "rusty.ninja training home");
    const network = element("span", "network-pill");
    network.dataset.network = "true";
    network.append(
      element("span", `status-dot ${this.#online ? "is-online" : "is-offline"}`),
      element("span", "network-pill__label", this.#online ? "online" : "offline"),
    );
    const identity = element("div", "brand-row");
    identity.append(brand, network);

    const actions = element("nav", "header-actions");
    actions.setAttribute("aria-label", "App controls");
    const stats = button("icon-button", "Stats", () => this.#openStats());
    stats.setAttribute("aria-label", "Open training stats");
    const settings = button("icon-button", "Settings", () => this.#openSettings());
    settings.setAttribute("aria-label", "Open settings");
    actions.append(stats, settings);
    header.append(identity, actions);
    return header;
  }

  #openStats(): void {
    const dialog = this.#root.querySelector<HTMLDialogElement>("[data-dialog='stats']");
    if (dialog && !dialog.open) dialog.showModal();
  }

  #openSettings(): void {
    const dialog = this.#root.querySelector<HTMLDialogElement>("[data-dialog='settings']");
    if (dialog && !dialog.open) dialog.showModal();
  }

  async #install(): Promise<void> {
    if (!this.#installPrompt) return;
    const prompt = this.#installPrompt;
    let failed = false;
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      failed = true;
    } finally {
      // The browser's install event is one-shot, even after a dismissal.
      this.#installPrompt = null;
      this.#render();
      if (failed) this.#toast("Install prompt is no longer available");
    }
  }

  #export(): void {
    const blob = new Blob([exportPlayerState(this.#state)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `rusty-ninja-progress-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.#toast("Progress exported");
  }

  async #import(file: File): Promise<void> {
    try {
      if (file.size > MAX_IMPORT_BYTES) {
        throw new Error("Progress file is too large");
      }
      const imported = importPlayerState(await file.text());
      let challenge: Challenge;
      try {
        challenge = imported.currentSeed
          ? this.#engine.fromSeed(imported.currentSeed)
          : this.#engine.next(imported);
      } catch {
        challenge = this.#engine.next(imported);
      }
      this.#state = setCurrentChallenge(imported, challenge.seed);
      this.#challenge = challenge;
      this.#restoreCurrentSession();
      const saved = savePlayerState(this.#state);
      this.#render();
      this.#toast(
        saved
          ? "Progress imported"
          : "Progress imported for this session, but could not be saved",
        saved ? 2600 : 5000,
      );
    } catch (error) {
      this.#toast(error instanceof Error ? error.message : "Could not import progress", 5000);
    }
  }

  #reset(): void {
    const confirmed = window.confirm(
      "Reset your level, history, concept stats, and every repair to Rusty on this device?",
    );
    if (!confirmed) return;
    this.#state = resetPlayerState();
    this.#challenge = this.#engine.next(this.#state);
    this.#state = setCurrentChallenge(this.#state, this.#challenge.seed);
    const saved = savePlayerState(this.#state);
    this.#selected.clear();
    this.#feedback = null;
    this.#confidence = "pretty-sure";
    history.replaceState(null, "", "#/");
    this.#render({ focusTitle: true });
    this.#toast(
      saved ? "Progress reset" : "Reset for this session, but could not be saved",
      saved ? 2600 : 5000,
    );
  }

  #render(options: {
    focusAnswer?: string;
    focusConfidence?: boolean;
    focusFeedback?: boolean;
    focusTitle?: boolean;
  } = {}): void {
    const shell = element("div", "app-shell");
    const main = element("main", "app-main");
    main.append(
      this.#renderRusty(),
      renderChallengeView({
        challenge: this.#challenge,
        confidence: this.#confidence,
        selected: this.#selected,
        feedback: this.#feedback,
        onConfidence: (confidence) => {
          this.#confidence = confidence;
          const saved = this.#persistCurrentSession();
          this.#render({ focusConfidence: true });
          this.#warnIfNotSaved(saved);
        },
        onAnswer: (answerId) => this.#chooseAnswer(answerId),
        onSubmit: () => this.#grade(),
        onNext: () => this.#nextChallenge(),
        onShare: () => void this.#shareChallenge(),
      }),
    );

    const footer = element("footer", "app-footer");
    footer.append(
      element("span", undefined, `Seed ${this.#challenge.seed}`),
      element("span", undefined, "Generated locally · no account"),
    );

    const statsDialog = renderStatsDialog(this.#state);
    statsDialog.dataset.dialog = "stats";
    const settingsDialog = renderSettingsDialog({
      state: this.#state,
      canInstall: this.#installPrompt !== null,
      standalone: isStandalone(),
      online: this.#online,
      onInstall: () => void this.#install(),
      onExport: () => this.#export(),
      onImport: (file) => void this.#import(file),
      onReset: () => this.#reset(),
    });
    settingsDialog.dataset.dialog = "settings";
    shell.append(this.#renderHeader(), main, footer, statsDialog, settingsDialog);
    this.#root.replaceChildren(shell);

    requestAnimationFrame(() => {
      if (options.focusAnswer) {
        this.#root
          .querySelector<HTMLButtonElement>(`[data-answer-id="${CSS.escape(options.focusAnswer)}"]`)
          ?.focus();
      } else if (options.focusConfidence) {
        this.#root
          .querySelector<HTMLButtonElement>(
            ".confidence .segmented__button[aria-pressed='true']",
          )
          ?.focus();
      } else if (options.focusFeedback) {
        this.#root.querySelector<HTMLElement>("[data-feedback='true']")?.focus();
      } else if (options.focusTitle) {
        const title = this.#root.querySelector<HTMLElement>(".challenge-panel__title");
        if (title) {
          title.tabIndex = -1;
          title.focus();
        }
      }

      if (this.#deferredDialog === "stats") this.#openStats();
      if (this.#deferredDialog === "settings") this.#openSettings();
      this.#deferredDialog = null;
    });
  }

  #handleKeyboard(event: KeyboardEvent): void {
    const target = event.target instanceof Element ? event.target : null;
    if (
      target?.closest(
        "dialog[open], button, a, input, textarea, select, summary, " +
        "[contenteditable]:not([contenteditable='false'])",
      ) ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    ) return;

    if (/^[1-9]$/.test(event.key) && !this.#feedback) {
      const index = Number(event.key) - 1;
      const answer = this.#challenge.answers[index];
      if (answer) {
        event.preventDefault();
        this.#chooseAnswer(answer.id);
      }
      return;
    }

    if (event.key === "Enter") {
      if (this.#feedback) {
        event.preventDefault();
        this.#nextChallenge();
      } else if (this.#challenge.interactionType === "find-all" && this.#selected.size > 0) {
        event.preventDefault();
        this.#grade();
      }
    }
  }

  #updateNetworkPill(): void {
    const pill = this.#root.querySelector<HTMLElement>("[data-network='true']");
    if (!pill) return;
    const dot = pill.querySelector<HTMLElement>(".status-dot");
    const label = pill.querySelector<HTMLElement>(".network-pill__label");
    if (dot) dot.className = `status-dot ${this.#online ? "is-online" : "is-offline"}`;
    if (label) label.textContent = this.#online ? "online" : "offline";
  }

  #toast(message: string, duration = 2600): void {
    this.#root.querySelector(".toast")?.remove();
    const toast = element("div", "toast", message);
    toast.setAttribute("role", "status");
    const dialogShell = this.#root.querySelector<HTMLElement>(
      "dialog[open] .modal__shell",
    );
    (dialogShell ?? this.#root).append(toast);
    window.setTimeout(() => toast.remove(), duration);
  }
}
