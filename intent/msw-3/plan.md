# Plan: Move the test mocks to msw 3

From [spec.md](spec.md).

## Files

- `packages/testing/package.json`, `pnpm-lock.yaml`: msw `^3.0.3`.
- `packages/testing/src/msw-browser.ts`: `blockExternal(origin, record)`, the `onUnhandledFrame` handler, using `HttpNetworkFrame` from `msw/experimental`.
- `apps/web/test/unhandled.ts`: new; the record the setup writes and the no-internet test drains, kept separate so the test does not load the setup file twice.
- `apps/web/test/browser-setup.ts`: `onUnhandledFrame`, the record module, unawaited `worker.stop()`.
- `apps/web/test/no-internet.browser.test.tsx`: new; the guard cases. The `.tsx` suffix keeps it out of the unit project, whose exclude names `*.browser.test.tsx`; in Node it would send a real request.
- `apps/web/test/public/mockServiceWorker.js`: deleted.
- `vitest.config.ts`: `publicDir` resolved to msw's installed worker script from `packages/testing`; browser `include` gains `test/**/*.browser.test.tsx`.
- `packages/application/src/archive-wind.test.ts`, `route-wind.contract.test.ts`: `onUnhandledFrame: "error"`.
- `cspell.json`, `docs/design.md`: as in the spec.

## Order

1. Bump msw.
2. Make the component and application tests pass on msw 3 (setup, config, record module, renamed options).
3. Add the no-internet test, then remove recording in `blockExternal` to confirm it fails, and restore it.
4. Delete the committed worker script and its cspell ignore.
5. Docs; intent status `done`.
6. Close #25 in favour of this pull request.

## Proof

- `pnpm test:component`: 8 files, 53 tests pass, including the two no-internet cases.
- The mutation in step 3 fails the first no-internet case.
- `pnpm exec vitest run --project unit packages/application/src/archive-wind.test.ts packages/application/src/route-wind.contract.test.ts`: pass.
- `pnpm verify` green through the verifier agent.
