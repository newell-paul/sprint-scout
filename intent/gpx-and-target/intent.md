# GPX robustness and a target that follows storage

Status: done
Opened: 25 October 2026 by Paul Newell

## Problem

Three findings deferred from the 25 October 2026 TypeScript review (`docs/reviews/2026-10-25-typescript-review.md`):

- **F5:** an unclosed `<trkpt>` makes the track-point regex rescan to the end of the file for every opening tag. A malformed file of a few megabytes freezes the page, because parsing runs on the main thread.
- **F6:** the import reads the whole selected file into memory before the 25 MB check.
- **F8:** the target input reads the stored target once. When the target changes elsewhere (another tab, or a remove followed by a new save), the field keeps the old draft, ready to overwrite the newer value.

## Proposed outcome

A GPX file with an unclosed track point is rejected quickly with a clear message. A file over 25 MB is refused before it is read. The target field shows the stored target whenever it changes.

## Affected users and parts

`packages/application/src/gpx.ts`, `apps/web/app/routes/efforts-panel.tsx`, `apps/web/app/routes/target-settings.tsx` and their tests.

## Constraints

No Strava data; parsing stays deterministic and runs in Node for the unit tests (no `DOMParser`). No new network request.

## Open questions

None.
