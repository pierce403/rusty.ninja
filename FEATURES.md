# rusty.ninja features

This is the living product specification and acceptance tracker. Agents read the
affected entry before implementation and update it alongside behavior or evidence.

## Features

### Adaptive Rust security wargame

- **Stability**: in-progress
- **Description**: Deliver a mobile-first, endless Rust security code-review
  game that adapts to the player and works offline after first load.
- **Properties**:
  - Twenty-six deterministic procedural templates cover all eight interaction
    formats from ownership fundamentals through unsafe abstractions, FFI,
    concurrency, and advanced soundness.
  - A continuous uncertainty-aware rating adapts difficulty on a 0–10 scale and
    makes exact level 10 an exceptional calibrated result rather than a grind.
  - Versioned localStorage preserves exact in-progress feedback, concept stats,
    calibration, and bounded durable replay protection without an account.
  - Six original Rusty progression states, responsive controls, shareable seeded
    hashes, export/import/reset, and accessible keyboard behavior support a fast
    phone-first loop.
  - Incorrect answers include a compact, template-specific reading list from the
    relevant official Rust, Serde, Tokio, or serde_json documentation.
  - A manifest and generated service worker cache the application and challenge
    assets for offline use.
  - Vite uses `/` as its base path for the `rusty.ninja` custom domain.
  - Pushes to `main` build with npm and deploy through GitHub Actions.
- **Dependencies**: `index.html`, `src/`, `public/`, `vite.config.ts`,
  `package.json`, `.github/workflows/deploy.yml`
- **Test Criteria**:
  - [x] All unit/generator tests, typechecking, production build, and PWA artifact
    checks pass locally.
  - [x] Generator review confirms answer cardinality, deterministic replay,
    difficulty bounds, and technically defensible classifications and fixes.
  - [x] Manual samples near levels 1, 3, 5, 7, 9, and 10 show a substantial
    progression from compiler reasoning to multi-invariant soundness review.
  - [x] The exact published tree deploys successfully through GitHub Actions.
  - [x] The public game loop, deterministic seeded route, and exact reload resume
    are verified against the production deployment.
  - [x] The production manifest, service worker, social preview, and generated
    precache structure are present with successful responses and correct types.
  - [x] Every registered challenge template has one to three unique HTTPS links
    on approved official documentation hosts, shown only after an incorrect answer.
  - [ ] Standalone install, offline relaunch, and the narrow layout are exercised
    on a mobile-capable browser or physical device.
  - [x] GitHub Pages reports `rusty.ninja` as its custom domain with a healthy
    certificate and enforced HTTPS.

### Project definition

- **Stability**: stable
- **Description**: Train Rust developers and security engineers to recognize
  realistic review and interview bug patterns in short, repeatable sessions.
- **Properties**:
  - The intended user and problem are explicit.
  - The first milestone has a narrow, observable outcome.
  - Technology choices follow product requirements rather than precede them.
- **Test Criteria**:
  - [x] The owner supplied and approved the product definition.
  - [x] The first usable milestone and acceptance criteria are documented here.

### Agent collaboration system

- **Stability**: stable
- **Description**: Give humans and coding agents a durable, reviewable way to
  coordinate tasks, evidence, memory, and reusable procedures.
- **Properties**:
  - `AGENTS.md` is the canonical repository-wide instruction file.
  - `TASKS.md` is the bounded shared queue and handoff surface.
  - Dated logs remain distinct from curated memory and proposed learnings.
  - `SKILLS.md` indexes validated procedures under `skills/`.
  - Harness compatibility files resolve to `AGENTS.md`.
- **Dependencies**: `AGENTS.md`, `TASKS.md`, `MEMORY.md`, `SKILLS.md`, `memory/`,
  `skills/curator/`
- **Test Criteria**:
  - [x] Required operating documents and memory directories exist.
  - [x] `CLAUDE.md` and `GEMINI.md` resolve to `AGENTS.md`.
  - [x] The `curator` skill passes the skill validator.
  - [x] Agent instructions define task ownership, handoffs, evidence, and safe
    promotion of learnings.
