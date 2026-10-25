# Name the network rule's two exceptions

Status: done
Opened: 25 October 2026 by Paul Newell

## Problem

`AGENTS.md` and `REVIEW.md` say every network request follows a user action or consent. Two owner decisions in `docs/design.md` contradict that: the map loads OpenStreetMap tiles directly (9 September 2026), and the example segment's forecast loads on a first visit (the first-visit entry). The 25 October 2026 TypeScript review flagged the mismatch; an agent or reviewer reading the rule literally would report both as violations.

## Proposed outcome

The rule names both exceptions and points to `docs/design.md`. Behaviour does not change.

## Affected users and parts

`AGENTS.md`, `REVIEW.md`. No code, tests or baselines.

## Constraints

The exceptions stay as narrow as the design entries: tiles, and only the example's public start coordinate on a first visit. Changing `AGENTS.md` runs the evals workflow.

## Open questions

None. The owner chose rewording over gating both behind actions.
