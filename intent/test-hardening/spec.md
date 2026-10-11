# Spec: test hardening

## Behaviour

Only the rider profile changes: unknown fields in `sprint-scout.rider.v1` survive a read and a save. Nothing changes on screen.

## Data and privacy

The tests gain guards: weather requests carry no cookie even when one is set for the host; no forecast request carries a drafted, unsaved coordinate; any request to an origin no stub handles fails the test.

## Tests

1. Privacy: cookie read through `allHeaders()` with a seeded cookie.
2. Faults: the unreadable-storage test reaches Save without swallowing errors and asserts the refusal.
3. Privacy: a drafted route sends no forecast request before Save.
4. Playwright and msw: unhandled external requests are recorded and fail the test.
5. Efforts: GPX imports tick the own-recording box first.
6. Time property: known-valid windows must resolve; invalid ones must give their exact code.
7. ESLint forbids `crypto.randomUUID` outside `newId`.
8. Keyboard: selecting a later hour changes the slider; ArrowDown scrolls the table.
9. Faults: no retry within a minute of a rate-limit error, on a controllable clock.
10. Components: loading states and the forecast error state are final states, so axe sees them.
11. Route wind: 48 rows accepted, 49 refused; a body over 100,000 bytes refused.
12. Storage: unknown route and rider fields survive; a v1 rider fixture.

## Docs

`docs/design.md` entry for the rider change; `docs/lessons.md` entry.
