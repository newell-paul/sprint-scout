# Lessons

One entry per bug that reached `main` or a shipped build, newest first. Each names the test that now catches it. When a class of mistake appears twice, it also becomes a line under "Known mistakes" in `AGENTS.md`.

## 9 October 2026: saving a route crashed on a phone over HTTP

- What broke: `crypto.randomUUID is not a function` when saving a segment from a phone on the LAN dev server.
- Found by: the owner, testing on a phone at `http://192.168.4.23:3000`.
- Cause: `randomUUID` exists only in secure contexts; plain HTTP on a LAN address is not one.
- Fix: `newId()` in `apps/web/app/routes/library.ts` falls back to `getRandomValues`.
- Test: `library.test.ts`, `describe("newId")`, secure and fallback cases.
