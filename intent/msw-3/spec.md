# Spec: Move the test mocks to msw 3

From [intent.md](intent.md).

## Behaviour

Nothing a user sees changes: msw is a test dependency and nothing in the static export moves.

For the suites:

- `@scout/testing` depends on msw `^3.0.3`.
- **Component tests.**
  - The worker is set up with `onUnhandledFrame`.
  - A request to the page's own origin passes through.
  - A request to any other origin, or any frame that is not HTTP, is recorded and answered as a network error, so it never leaves the browser. msw 2 recorded it and then let it through.
  - The suite's `afterEach` still fails a test that recorded one.
- **Application tests.** The Node server uses `onUnhandledFrame: "error"`, as `onUnhandledRequest: "error"` did before.
- **Worker script.** The component project serves msw's own `mockServiceWorker.js` from the installed package (Vite `publicDir`), and the committed copy under `apps/web/test/public` is deleted. The script can no longer drift from the client.
  - This replaces the intent's answer to question 2. msw 3 no longer copies the script on install, so `msw.workerDirectory` would do nothing on its own.
- **Stopping the worker.** It is stopped without awaiting. msw 3's `worker.stop()` waits for requests in flight, and the timeout fixtures (`delay("infinite")`) never answer.
- **Error states.** If msw's experimental frame API changes, the no-internet test fails with the recorded list, or type checking fails on `HttpNetworkFrame`.

## Data and privacy

No change to what the app sends. The tests are stricter: an unmocked external request in a component test is now blocked as well as reported.

## Calculations

None. msw 3 no longer patches `setTimeout`. The component tests fake only `Date`, and no msw-backed test fakes timers, so the suites run as before.

## Tests

- New `apps/web/test/no-internet.browser.test.ts`, with the browser project's `include` extended to `test/**/*.browser.test.ts`:
  - a `fetch` to `https://example.com/…` rejects and is the one recorded target;
  - a same-origin `fetch` of the worker script succeeds and records nothing.
- The guard is checked by mutation during the build: with recording removed, the first case fails.
- The existing unit, component and e2e suites pass unchanged. No ARIA snapshot or screenshot changes.

## Docs

- `docs/design.md`: dated entry "msw 3 for the test mocks — 24 October 2026", covering the stricter guard, the served worker script and the unawaited stop.
- `cspell.json`: the ignore for `apps/web/test/public/**` goes with the folder.
