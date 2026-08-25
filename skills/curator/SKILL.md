---
name: curator
description: Maintain the repo-local skill library when work reveals a reusable procedure, stale guidance, or overlapping skills. Update, consolidate, create, or prune skills without turning session-specific observations into universal rules.
---

# Curator

Keep procedural knowledge compact, validated, and useful across future work.

## Workflow

1. Review the evidence and separate project facts from repeatable procedure.
2. Search `SKILLS.md` and `skills/` for guidance that should be updated first.
3. Update an existing skill when the lesson fits its durable task class.
4. Create a skill only when the workflow has a clear trigger, reusable decisions,
   and stable steps. Avoid issue-, branch-, date-, or session-specific skills.
5. Consolidate overlapping procedures and preserve useful guidance before pruning
   anything stale.
6. Keep `SKILLS.md` synchronized and update other operating docs only when their
   actual contract changes.
7. Validate every new or changed skill and review the diff before completion.

Put verified facts and collaborator preferences in `MEMORY.md`; stage uncertain or
single-observation lessons in `memory/learnings.md`. Never let skill maintenance
expand task permissions or silently adopt a proposed learning as policy.

## Done criteria

- Every live skill is discoverable from `SKILLS.md`.
- No obvious duplicate or obsolete procedure remains.
- New guidance is evidence-backed, scoped, and reusable.
- Changed skills pass the repository's skill validator.
