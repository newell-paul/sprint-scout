# Advisory gate that blocks only what a pull request changes

Status: accepted
Opened: 23 October 2026 by the owner

## Problem

The `OSV scan` job checks the whole lockfile against the live advisory database on every pull request. Any advisory published anywhere fails every open pull request, whether or not it touched the package. On 23 October 2026 that happened four times in one day (zod, body-parser, four for fast-uri) and blocked #23, #27 and #30 in turn. Each needed an override or ignore, then a merge of `main` into every open branch.

Eight of those nine advisories were in dev-only tooling (Lighthouse CI, eslint plugins, markdownlint) that never ships in the static export. Only zod reaches users.

Dependabot security updates are already on, but they raised no pull request for any of them: each was transitive under a parent pinned to an old release, which only an override can lift.

## Proposed outcome

- A pull request fails the OSV check only for advisories its lockfile has and its base does not. An advisory already on `main` shows in the job summary and does not block.
- Advisories in shipped runtime dependencies still block every pull request, through the existing `pnpm audit:prod` step (high and critical).
- On `main`, the full OSV result is still published to code scanning, so nothing goes unseen.
- When Dependabot can fix advisories, they arrive as one grouped security pull request instead of one each.
- The docs say which gate is for what.

## Affected users and parts

- Owner and agents opening pull requests.
- `.github/workflows/ci.yml` (OSV job), `.github/dependabot.yml`, a small script under `scripts/` with tests in `packages/testing`.
- `docs/test-strategy.md`, `docs/sdlc.md`, `docs/design.md`.
- No app code, no screens.

## Constraints

- No new secrets, no schedules.
- The runtime gate does not weaken: `audit:prod` stays blocking.
- `osv-scanner.toml` ignores keep working; an expired ignore shows again in the `main` report.
- The comparison is deterministic and tested.

## Open questions

1. Should the `main` push run fail on existing advisories (red main) or only report them? Resolved: report only, since the pull requests already gate what changes.
2. Does a pull request that leaves `pnpm-lock.yaml` unchanged skip the scans? Resolved: yes, it cannot introduce an advisory.
