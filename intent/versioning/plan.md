# Plan: versioning

## Files

- `package.json`: `"version": "0.9.0"`, plus the `release:bump` and `release:notes` scripts.
- `packages/testing/src/release.ts`: the pure `releaseNotes()` and `nextVersion()`, with `release.test.ts` beside it.
- `packages/testing/src/release-bump.cli.ts` writes the root version. `packages/testing/src/release-notes.cli.ts` reads intent statuses at HEAD and at the previous tag through `git`, then writes the notes.
- `.github/workflows/release.yml`: the workflow_run trigger on Checks, the head-repository guard, the tag-exists check, notes, `gh release create`.
- `apps/web/next.config.ts`: exposes `NEXT_PUBLIC_APP_VERSION` from the root `package.json` and `NEXT_PUBLIC_COMMIT` from `GITHUB_SHA` or `git rev-parse`.
- `apps/web/app/routes/build-stamp.tsx` with `build-stamp.browser.test.tsx`; `route-drawer.tsx` renders it in the footer.
- `packages/testing/src/dashboard.ts`, `dashboard.cli.ts` and `dashboard.test.ts`: `version` on `Inputs` and `Snapshot`, shown in the header. The CLI defaults to the root `package.json` version.
- `README.md` (badge), `.claude/skills/release/SKILL.md`, `docs/sdlc.md`, `docs/design.md`.

## Order

1. Pure functions and their unit tests, written to fail first.
2. CLIs and package scripts.
3. Dashboard version.
4. Build stamp component, its test, the next.config env and the footer.
5. Release workflow.
6. Docs, README badge, the release skill.
7. `pnpm verify`; set the intent to done.

## Proof

- `pnpm test` covers the notes, the bump and the dashboard.
- `pnpm test:component` covers the build stamp.
- `pnpm release:notes` prints the 0.9.0 notes locally.
- `pnpm check:deploy` holds the size and Lighthouse budgets.
- `pnpm verify` green.
- After merge: the Release workflow creates `v0.9.0`, and the live footer and dashboard show it.
