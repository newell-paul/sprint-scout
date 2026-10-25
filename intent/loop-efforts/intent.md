# Efforts on loop segments

Status: done
Opened: 25 October 2026 by Paul Newell

## Problem

A segment whose finish is its start (a park loop, a race circuit) saves and forecasts, but GPX import almost never finds an effort on it. At the shared point the matcher cannot tell finishing a lap from starting the next: the nearest point on the segment jumps from its end back to its start, which reads as riding backwards, so the effort is dropped. Probing a 400 m square loop on 25 October 2026: one lap then round again, 0 efforts; two laps then straight on, 0; only a single lap that leaves straight past the finish was found.

## Proposed outcome

When the finish lies within the start gate (25 m) of the start, the segment is a loop: every complete lap of a continuous ride is an effort, a lap starts where the previous one finished, and joining the loop from any side of the start gate counts. Point-to-point segments match exactly as before.

## Affected users and parts

`packages/analysis/src/effort-match.ts` and its tests; `docs/design.md`.

## Constraints

Pure and deterministic, 100 % coverage in `packages/analysis`, property tests with the fixed seed. No change to stored data: efforts already saved stay valid.

## Open questions

None.
