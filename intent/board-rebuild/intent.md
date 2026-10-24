# Manual rebuild of the intent board

Status: accepted
Opened: 24 October 2026 by the owner

## Problem

The intent board is rebuilt only when something is pushed to `main`. An intent whose pull request opens on Monday does not appear until the next merge, which can be days later, and the check states on its card age just as long. A schedule would fix the lag but the repository runs no schedules.

## Proposed outcome

- The owner can refresh the published board on demand from GitHub, without a push to `main` and without rerunning the test suites.
- The board links to that control, so it is one click from the page that is out of date.
- Everything else on the dashboard stays as the last `main` run left it.

## Affected users and parts

- Owner.
- `.github/workflows/pages.yml`: its manual run refreshes the board before publishing.
- `packages/testing/src/dashboard.ts`, `dashboard.cli.ts` and their tests.
- `docs/design.md`, `docs/sdlc.md`.

## Constraints

- No schedules and no new secrets; the job token, read-only apart from what Pages already needs.
- Static HTML with no scripts; the "button" is a link to GitHub.
- Deterministic and tested.

## Open questions

1. A separate workflow, or the Pages workflow's existing manual run? Resolved: the existing manual run. Pages replaces the whole site on every deploy, so a refresh has to rebuild and gate the app anyway, and that workflow already does.
2. Who can press it? Resolved: anyone with write access, as GitHub allows for every manual run.
