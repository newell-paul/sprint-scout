# Lessons

One entry per bug that reached `main` or a shipped build, newest first. Each names the test that now catches it. When a class of mistake appears twice, it also becomes a line under "Known mistakes" in `AGENTS.md`.

## 11 October 2026: tests that could not fail

- What broke: nothing shipped broken, but twelve tests could not catch the regression they were named for. The worst: the no-cookie privacy check read `request.headers()`, which never includes cookies; the unreadable-storage test swallowed every error before Save. The rider profile also dropped unknown fields on save, against the storage contract in `docs/test-strategy.md`.
- Found by: a read-only Codex review of the suite. Each finding was confirmed by mutating the product and watching the test stay green.
- Fix: each test now fails on its mutation (see `intent/test-hardening/`). External requests no stub answers fail the test in Playwright and in Vitest browser mode. ESLint forbids `randomUUID` outside `newId()`, closing the second half of the 9 October entry below. `riderStorageValue` merges a save into the stored profile.
- Tests: `privacy.spec.ts` (credentials, drafted route), `faults.spec.ts` (unreadable storage, rate limit), `time.property.test.ts` (oracle and clock-change cases), `route-wind.test.ts` (row and byte caps), `rider.test.ts`, `library.migrations.test.ts`, `keyboard.spec.ts`, and the loading states in `wind-preview` and `terrain-panel` browser tests.
- Rule: prove a new test can fail by breaking the code it guards before trusting it green.

## 9 October 2026: saving a route crashed on a phone over HTTP

- What broke: `crypto.randomUUID is not a function` when saving a segment from a phone on the LAN dev server.
- Found by: the owner, testing on a phone at `http://192.168.4.23:3000`.
- Cause: `randomUUID` exists only in secure contexts; plain HTTP on a LAN address is not one.
- Fix: `newId()` in `apps/web/app/routes/library.ts` falls back to `getRandomValues`.
- Test: `library.test.ts`, `describe("newId")`, secure and fallback cases.
