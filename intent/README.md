# Intent

One folder per piece of work beyond a one-line fix. Three files, committed in this order:

1. `intent.md`: the problem and the outcome, reviewed by the owner, status `accepted` before anything else is written. Template in `.claude/skills/intent/SKILL.md`.
2. `spec.md`: behaviour, data and privacy, calculations, tests, docs.
3. `plan.md`: files, order, proof. Committed before the first source change and updated in the same commit as any divergence.

The commit history of this folder is the audit trail: who asked for what, what was produced and who approved it. Dated decisions still go in `docs/design.md`; an intent links to its entry when it is done.
