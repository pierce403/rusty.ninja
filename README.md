# rusty.ninja

rusty.ninja is a mobile-first, installable Rust security training game. It continuously generates deterministic code-review challenges, adapts their difficulty to the player, and tracks a skill estimate from level `0.0` to `10.0`.

The curriculum spans foundational Rust reasoning, safe-code security failures, integer and allocation hazards, parsing, concurrency, unsafe abstractions, FFI, and advanced soundness. Rusty, the game's battered robot, is repaired and upgraded as the player's skill improves.

The v1 registry contains 26 procedural templates across all eight interaction formats. Each template varies domain details, values, types, answer order, and selected branches from a stable seed. See [docs/CURRICULUM.md](docs/CURRICULUM.md) for the review model and primary technical references.

## How it works

- Challenges are produced locally from composable templates and a seeded PRNG. A challenge URL such as `/#/c/7F3A91` always reproduces the same challenge.
- A difficulty-aware rating model compares the player estimate with each challenge difficulty. It tracks uncertainty, slows progression near level 10, and samples occasional easier and harder challenges for calibration.
- Feedback distinguishes compiler errors, logic flaws, panics and denial of service, security vulnerabilities, context-dependent contracts, undefined behavior, and unsound safe abstractions.
- Incorrect-answer feedback links directly to the relevant official Rust, Serde, Tokio, or serde_json documentation so the underlying API and language contracts are easy to verify.
- Progress, exact in-progress answers/feedback, concept proficiency, streaks, calibration, and bounded durable replay protection stay in versioned `localStorage`. No account or backend is required.
- The generated service worker precaches the app shell, challenge engine, icons, and Rusty artwork. After one successful production load, training and progress work offline.

## Local development

Node.js 24 (the current LTS used in deployment) is required.

```sh
npm install
npm run dev
```

Useful checks:

```sh
npm test
npm run typecheck
npm run build
npm run preview
```

The production build also verifies the generated manifest, service worker, offline precache, custom-domain file, and required icon/artwork assets. `npm run preview` is the best manual check for installability; service workers are intentionally disabled in the Vite development server.

## Project layout

```text
src/
  game/          deterministic engine, rating, routing, and player state
  challenges/    reviewed procedural challenge templates
  rusty/         mascot progression and dialogue
  ui/            DOM views and interactions
  styles/        mobile-first visual system
public/
  icons/         PWA and platform icons
  rusty/         optimized mascot progression artwork
```

## Adding a challenge template

1. Implement the `ChallengeTemplate` contract in the appropriate concept directory. Use only the supplied seeded RNG; never use `Math.random()`, time, locale, or network state.
2. Register the template in `src/challenges/registry.ts` with honest difficulty and concept metadata.
3. Add invariant tests covering deterministic reproduction, answer IDs, correct-answer cardinality, difficulty bounds, and every randomized branch.
4. Compile representative Rust fixtures where practical, including relevant debug/release or architecture variants.
5. Document why each answer, impact classification, fix, and distractor is correct. Unsafe and soundness claims need an especially rigorous review.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the correctness standard.

## Working agreements

- [`AGENTS.md`](AGENTS.md) is the canonical repository guide for agents.
- [`FEATURES.md`](FEATURES.md) tracks product behavior and acceptance evidence.
- [`TASKS.md`](TASKS.md) is the bounded work queue and handoff surface.
- [`MEMORY.md`](MEMORY.md) and [`memory/logs/`](memory/logs/) retain reviewed project context and dated evidence.
- [`SKILLS.md`](SKILLS.md) indexes reusable repo-local procedures.

## Deployment

Every push to `main` runs tests and a production build in `.github/workflows/deploy.yml`, then publishes `dist/` with GitHub Pages. Vite is configured for the custom-domain root rather than a repository subpath. `public/CNAME` fixes the production domain as `rusty.ninja`.

In the repository's Pages settings, select **GitHub Actions** as the source, configure `rusty.ninja` as the custom domain, and enforce HTTPS once DNS is active.

## Progress portability

The settings view can export progress as JSON, import a compatible versioned export, or reset local progress. Export before clearing site data or moving to another device.

## License

No license has been selected yet. All rights are reserved until the repository owner adds one.
