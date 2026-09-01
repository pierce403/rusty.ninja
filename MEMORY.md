# Project memory

Curated, verified project knowledge belongs here. Dated activity belongs in
`memory/logs/`; candidate lessons belong in `memory/learnings.md`.

## Project

- The repository is named `rusty.ninja`.
- The product is a mobile-first, installable Rust security training game with
  deterministic procedural challenges, adaptive rating, local-only progress,
  and a six-stage Rusty robot progression.
- The implementation uses Vite, vanilla TypeScript and CSS, localStorage, and a
  generated Workbox service worker; it has no runtime backend.
- The agent collaboration workflow was initialized on 2026-08-25.
- GitHub Pages deploys the Vite `dist/` artifact from pushes to `main` at the
  `rusty.ninja` apex; Vite uses the root base path `/`.
- R2 challenge seeds encode one of 40 numbered review contexts for every semantic
  template. The engine excludes the prior two template families, while R1 and
  historical short links retain their original generated content.

## Durable conventions

- `AGENTS.md` is canonical for agent instructions.
- `FEATURES.md` is the product behavior and acceptance source of truth.
- `TASKS.md` is the bounded shared queue.
- Never store secrets or personal data in project memory.
