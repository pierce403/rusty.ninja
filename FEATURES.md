# rusty.ninja features

This is the living product specification and acceptance tracker. Agents read the
affected entry before implementation and update it alongside behavior or evidence.

## Features

### Project definition

- **Stability**: planned
- **Description**: Define the audience, problem, product shape, and first usable
  outcome for `rusty.ninja` with the project owner.
- **Properties**:
  - The intended user and problem are explicit.
  - The first milestone has a narrow, observable outcome.
  - Technology choices follow product requirements rather than precede them.
- **Test Criteria**:
  - [ ] The owner has approved a concise project definition.
  - [ ] The first milestone and its acceptance criteria are documented here.

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

