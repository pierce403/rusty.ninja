# rusty.ninja

`rusty.ninja` is a new Vite project. Its product direction is intentionally open;
the current site is a small public placeholder while the first real milestone is
defined.

## Local development

```sh
npm install
npm run dev
```

`npm run build` creates the production site in `dist/`. Every push to `main`
builds that directory and deploys it to GitHub Pages through
`.github/workflows/deploy-pages.yml`.

## Working agreements

- [`AGENTS.md`](AGENTS.md) is the canonical guide for agents.
- [`FEATURES.md`](FEATURES.md) is the living product and acceptance spec.
- [`TASKS.md`](TASKS.md) is the bounded work queue and handoff surface.
- [`MEMORY.md`](MEMORY.md) contains reviewed, durable project knowledge.
- [`SKILLS.md`](SKILLS.md) indexes reusable repo-local procedures.
- [`memory/logs/`](memory/logs/) holds dated chronological work notes.

Harness-specific instruction files (`CLAUDE.md` and `GEMINI.md`) point back to
the canonical `AGENTS.md`.

## Status

The Vite placeholder and GitHub Pages deployment are live. Product scope remains
to be defined with the project owner.
