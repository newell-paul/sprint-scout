---
name: intent
description: Start a piece of work by writing intent/<slug>/intent.md from a conversation, then spec.md and plan.md in order. Use when the owner describes a feature, change or problem larger than a one-line fix.
---

# Intent, spec, plan

Every piece of work beyond a one-line fix leaves three files under `intent/<slug>/`, committed in order. The commit history is the audit trail: who asked, what was produced, who approved.

## 1. intent.md

Brainstorm with the owner, then write the file from the template below. The owner reviews and corrects it before it is committed with status `accepted`.

```markdown
# <Title>

Status: draft | accepted | in build | done | dropped
Opened: <date> by <name>

## Problem

What is wrong or missing, for whom, with evidence if any.

## Proposed outcome

What is true when this is done. Observable, not a design.

## Affected users and parts

Which screens, packages, docs and tests change.

## Constraints

Data rights (no Strava data), deterministic calculations, static hosting, consent before any network request, size and Lighthouse budgets.

## Open questions

Numbered. Each is resolved in spec.md or the intent is dropped.
```

## 2. spec.md

Written from the accepted intent in one session. Sections: Behaviour (what the user sees, including empty, error and mobile states), Data and privacy (what leaves the browser and after which action), Calculations (inputs, formula or reference, determinism), Tests (unit, component, e2e, which ARIA snapshots change), Docs (which `docs/design.md` entry is added). Resolve every open question from the intent or send the intent back.

## 3. plan.md

Produced in plan mode from the spec and committed before the first source change. Sections: Files (each file touched and why), Order (the sequence of changes), Proof (the exact tests and checks that show it works, including `pnpm verify`). When implementation diverges, update plan.md in the same commit; a hook reminds you once per session if source changes without a plan update.

## Finishing

Set intent status to `done`, add the dated entry to `docs/design.md` if behaviour or architecture changed, and run the verifier agent before reporting completion.
