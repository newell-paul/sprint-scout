# Plan: wordmark as one word

## Files

- `apps/web/app/globals.css`: drop `margin-left` from `.logo-word-accent`.
- `packages/testing/src/dashboard.ts`: drop `margin-left` from `.brand b`.
- `packages/testing/src/dashboard.test.ts`: the brand assertion checks for no gap.
- `scripts/banner/banner.html`: drop `margin-left` from `.logo b`.
- `docs/images/banner.jpg`, `docs/images/social-preview.jpg`: `pnpm banner` against a local dev server.
- `docs/design.md`, `docs/implementation-plan.md`, `docs/integration-decisions.md`, `docs/validation.md`: "SprintScout" in prose; a dated design entry.

## Order

Test first, then the three stylesheets, then the banner render, then the docs.

## Proof

Screenshots of the planner and dashboard headers before and after, desktop and 390 px; `pnpm verify` green; the owner checks the planner on the local dev server before the pull request.
