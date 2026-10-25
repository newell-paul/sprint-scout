# CI and dashboard hardening

Status: done
Opened: 25 October 2026 by Paul Newell

## Problem

A whole-repository review on 25 October 2026 (six review agents over `d95ad89`) found that the dashboard and Pages workflows trust inputs they should not, and fail quietly where they should fail loudly:

- The dashboard's previous history and the manual Pages rebuild take the newest successful Checks run on a branch named `main`. A fork's pull request from its own `main` matches, and it runs its own `ci.yml`, so it can supply the `dashboard` artifact: its HTML would be published on the planner's origin, where it can read saved segments from localStorage.
- History comes only from green runs, so a red day never reaches the trends.
- A failed `gh` call or missing artifact still starts the history from nothing, with no error.
- A failed `gh` listing leaves an empty JSON file, the build crashes, and the job reports a 3σ breach.
- Pages checks out the newest commit on main, not the one whose Checks passed.
- A history entry without `mutationScore` crashes the badges.
- The collectors write empty lists or zeros on failure, which the dashboard shows as real values, and read review tallies from any run, a fork's included.
- The guard hook misses `git -C . push origin main` and `git push origin +branch`, and its env-file messages point at a file that was deleted.
- Comments and labels still say "runs" where the history counts days, and two comments describe removed code.

## Proposed outcome

- Only a push to main in this repository can supply the dashboard artifact, for the next build or for Pages.
- The previous history is the newest dashboard artifact from main, red runs included; a build that wrote no history uploads none. A missing history fails the job with a clear error.
- A failed GitHub API read is a warning and leaves its cards at n/a; a crash is reported as a crash, a breach as a breach.
- Pages publishes the commit that passed Checks, and fails rather than publishing without the dashboard.
- The collectors write nothing on failure, read only this repository's runs, and check counts are integers.
- The guard blocks the two push forms; its messages name no deleted file.
- Wording says days where it counts days.

## Affected users and parts

`.github/workflows/ci.yml`, `pages.yml`, `scripts/collect-reviews.mjs`, `collect-intents.mjs`, `.claude/hooks/guard.mjs`, `packages/testing/src/dashboard.ts`, `dashboard.cli.ts`, `bands.ts`, `drift.ts`, `packages/testing/bands.yaml`, `harness.test.ts`, `dashboard.test.ts`, `docs/design.md`, `docs/lessons.md`.

## Constraints

No new secrets, no schedules, no paid step. The page stays script-free.

## Open questions

None.
