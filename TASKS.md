# Tasks

This is the authoritative bounded queue. Keep entries small enough to verify and
move completed work to the archive rather than accumulating an unbounded backlog.

## In progress

None.

## Ready

- [ ] Complete device-level PWA acceptance. Owner: next mobile-capable session.
  Exercise standalone install, offline relaunch, and the narrow layout; the current
  cloud browser exposes neither service workers nor viewport emulation.

## Blocked

None.

## Completed

- [x] 2026-09-01 — Keep difficulty-10 successes visibly rewarding throughout
  the level-9.9 endgame. Evidence: level 9.93 reaches mastery within four correct
  certain answers, nonzero sub-cent deltas remain visible, and 65 tests plus the
  production/PWA build pass.
- [x] 2026-09-01 — Let calibrated level-10 successes complete progression at
  the default confidence while keeping guesses and easy-question grinding below
  mastery. Evidence: targeted rating regression tests and release gates.
- [x] 2026-08-25 — Add and publish a practical Rust code-reading track. Evidence:
  eight four-choice generators, 61 tests, canonical/legacy seed compatibility,
  commit `f2c4fa7`, Actions run `32913105672`, and successful production smoke
  tests for both output prediction and behavior explanation with missed-answer
  Rust documentation.
- [x] 2026-08-25 — Add and publish an early procedural Rust syntax and vocabulary
  track. Evidence: six generators, 57 tests, primary-documentation review,
  commit `7c8857b`, Actions run `32905705468`, and a successful production
  missed-answer/documentation smoke test.
- [x] 2026-08-25 — Add contextual official documentation to incorrect-answer
  feedback. Evidence: all 26 templates covered by 39 live links, 53 tests,
  typecheck, production build, and PWA verification.
- [x] 2026-08-25 — Publish and production-smoke the complete rusty.ninja v1
  wargame. Evidence: commit `9bc8741`, Actions run `32868659617`, successful
  answer/feedback/next loop, deterministic seeded replay, exact reload resume,
  stats/settings dialogs, and live manifest/service-worker/social asset responses.
- [x] 2026-08-25 — Attach `rusty.ninja` to GitHub Pages. Evidence: Actions run
  `32862025021`, approved certificate, enforced HTTPS, HTTP-to-HTTPS redirect,
  and live root-relative HTML/CSS/JS responses.
- [x] 2026-08-25 — Publish and verify the Vite hello-world placeholder through
  GitHub Pages. Evidence: local build and preview, Actions run `32861449656`,
  Pages workflow configuration, and live HTTPS HTML/CSS/JS responses.
- [x] 2026-08-25 — Initialize the public repository and Recurse-inspired agent
  collaboration system. Evidence: operating documents, compatibility links,
  validated curator skill, initial commit, and verified public GitHub remote.
