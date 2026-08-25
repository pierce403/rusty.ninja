# Agent guidelines for rusty.ninja

## Scope

These instructions apply to the entire repository unless a more specific
`AGENTS.md` exists lower in the tree.

## Responsibilities

- Collaborate with the project owner to turn `rusty.ninja` into a clearly scoped,
  verifiable product.
- Keep implementation, documentation, feature status, tasks, and evidence aligned.
- Leave the repository easier for the next human or agent to understand.

If these responsibilities no longer describe the project, ask the owner for
direction and update this file rather than silently inventing a new mandate.

## Start of work

1. Read `AGENTS.md`, `FEATURES.md`, and `TASKS.md`.
2. Inspect `git status` and preserve unrelated or user-owned changes.
3. Read only the relevant entries in `MEMORY.md`, `memory/`, and `SKILLS.md`.
4. Confirm the task is represented in `TASKS.md`, or add a bounded entry before
   substantial work.

## Communication and handoffs

- State assumptions and material trade-offs early; report observable results,
  exact blockers, and remaining gates.
- Use `TASKS.md` as the shared queue. Keep at most one item per agent marked
  `in-progress`, and record dependencies or ownership when parallel work exists.
- Do not claim another agent's work, overwrite it, or broaden its scope without
  coordination. Preserve unrelated working-tree changes.
- Record a concise dated note in `memory/logs/YYYY-MM-DD.md` after meaningful work:
  task, evidence, decisions, and next step.
- Keep secrets, credentials, personal data, and noisy transcripts out of all
  committed communication and memory files.

## Feature workflow

- Read affected `FEATURES.md` entries before changing behavior.
- Use exactly `stable`, `in-progress`, or `planned` for `Stability`.
- Treat `Properties` as the behavioral contract and `Test Criteria` as the
  acceptance gate.
- Update `FEATURES.md` in the same contribution when behavior, evidence,
  dependencies, or readiness changes.
- Mark criteria complete only with evidence; mark a feature `stable` only when it
  is complete, tested, and ready for its stated use.

## Memory and learning

- `memory/logs/` is chronological evidence, not policy.
- `memory/learnings.md` stages positive and negative lessons for review.
- `MEMORY.md` contains concise, verified knowledge worth carrying forward.
- Promote guidance only after owner approval or repeated evidence:
  task evidence -> dated log -> proposed learning -> approved/repeated learning
  -> `AGENTS.md`, `MEMORY.md`, or a validated skill.
- Do not turn one observation into a universal rule.

## Skills

- `SKILLS.md` is the compact catalog; procedures live in
  `skills/<name>/SKILL.md`.
- Use the `curator` skill when reusable procedure emerges, existing guidance
  becomes stale, or skills overlap.
- Prefer updating or consolidating a skill before adding a narrow new one.
- Validate every new or changed skill before committing it.

## Completion

- Run the narrowest meaningful checks plus the project's broad verification gate
  once one exists.
- Run `git diff --check` and inspect the final diff.
- Update `TASKS.md`, `FEATURES.md`, and the dated log when their state changed.
- Summarize what changed, verification performed, notable decisions, and any
  remaining blocker. Do not equate a successful build with runtime or deployment
  proof.

## Current project notes

- Product scope and technology choices are not yet defined.
- `.codex/`, `.agents/`, and repo-local `tmp/` are local working artifacts and
  stay untracked.
- `AGENTS.md` is canonical; `CLAUDE.md` and `GEMINI.md` are compatibility links.

