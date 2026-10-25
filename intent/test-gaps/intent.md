# Test gaps and the board hour that followed a hand-picked segment

Status: done
Opened: 25 October 2026 by Paul Newell

## Problem

The whole-repository review on 25 October 2026 found one bug and four behaviours with no test:

- **C1 (bug):** after Open on the opportunity board, picking another segment by hand opened it at the board's hour instead of its first hour, because the board's request stayed set.
- **C2:** nothing proves that renaming a segment keeps its target, shelter and efforts.
- **C3:** nothing proves that a board left open re-ranks once its forecasts expire.
- **C4:** nothing proves that efforts on more date ranges than one past-wind load allows finish on the next press.
- **C5:** "tomorrow moves the slider past today" passed for any hour after the first; it should land on the first hour after local midnight. Rider numbers surviving a reload was already covered (`e2e/rider.spec.ts`).

## Proposed outcome

A hand-picked segment opens at its first hour, and each behaviour above has a test that fails if it regresses.

## Affected users and parts

`apps/web/app/routes/route-drawer.tsx`; `e2e/board.spec.ts`, `clock.spec.ts`, `drawing.spec.ts`, `forecast.spec.ts`; `apps/web/app/routes/efforts-panel.browser.test.tsx`; `docs/design.md`, `docs/lessons.md`.

## Constraints

No new network requests. Tests follow arrange, act, assert with page objects.

## Open questions

None.
