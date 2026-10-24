# Move the test mocks to msw 3

Status: accepted
Opened: 24 October 2026 by the owner

## Problem

Dependabot's #25 bumps msw from 2.15.0 to 3.0.3 and fails three ways:

- Static gates: `apps/web/test/browser-setup.ts` passes `onUnhandledRequest` to `worker.start()`. msw 3 renamed it `onUnhandledFrame` and changed the callback to `({ frame, defaults })`.
- Components (Chromium): every test hangs in `beforeAll` for 30 s. The committed `apps/web/test/public/mockServiceWorker.js` is the 2.15.0 script, and a msw 3 client does not talk to it.
- `archive-wind.test.ts` passes `onUnhandledRequest: "error"` to `server.listen()`, which no longer type-checks either.

msw is test-only: it stands in for Open-Meteo in component tests (browser worker) and application tests (Node server). It never ships.

The unhandled-request guard matters beyond typing. It is how the component suite proves no test reaches the internet, the test-side half of the rule that every network request follows a user action or consent.

## Proposed outcome

- msw 3 in `@scout/testing`; #25 is replaced by this work or rebased onto it.
- Every component test still fails if it makes a request to another origin; application tests still error on an unhandled request.
- The worker script matches the installed msw and stays matched on future upgrades without a hand step.
- All suites pass with no test or ARIA baseline changed for the upgrade's sake.

## Affected users and parts

- `packages/testing` (`msw.ts`, `msw-browser.ts`, `handlers.ts`, `package.json`).
- `apps/web/test/browser-setup.ts`, `apps/web/test/public/mockServiceWorker.js`.
- `packages/application/src/archive-wind.test.ts`, `route-wind.contract.test.ts`.
- `docs/design.md`, `docs/test-strategy.md` if they name the option.
- e2e is untouched: it mocks with Playwright routes, not msw.

## Constraints

- No app code changes; nothing in the static export changes.
- The no-internet guard is not weakened, and a test proves it still fires.
- Deterministic: msw 3 no longer patches `setTimeout`; only `delay("infinite")` is used and no msw test fakes timers, so nothing should change, but the suites confirm it.
- Node 26 and TypeScript 6 already meet msw 3's minimums.

## Open questions

1. The documented way to read the URL in `onUnhandledFrame` imports `HttpNetworkFrame` from `msw/experimental`. Use it, or check the frame's shape without the import? Resolved: use it, behind one helper in `@scout/testing`, with a test that an external request is still caught, so a change to the experimental API fails loudly.
2. Keep the committed worker script and let msw refresh it on install (`"msw": { "workerDirectory": ["apps/web/test/public"] }`), or switch to the new `msw/vite` plugin that serves it? Resolved: keep the file and add `workerDirectory`; the plugin changes the Vitest browser config for no gain here.
