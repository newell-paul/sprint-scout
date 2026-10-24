# Evals on main for the dashboard

Status: done
Opened: 24 October 2026 by the owner

## Problem

The dashboard's evals card and README badge have always said n/a. The dashboard only takes an `evals-report` artifact from a run on `main`, so that it reflects merged configuration, but the Evals workflow runs only on pull requests and by hand. Six paid runs passed on pull requests on 23 October; none counted.

## Proposed outcome

- The dashboard shows an eval result now, from one run dispatched on `main`.
- It stays current: whenever a change to the agent configuration merges, the paid tasks run again on `main` and the dashboard takes that result.

## Affected users and parts

- Owner and readers of the dashboard and README.
- `.github/workflows/evals.yml`; `docs/sdlc.md`, `docs/design.md`.

## Constraints

- No schedules. Paid runs only on an event: a merge that changes the configuration, behind `EVALS_ENABLED`, on `CLAUDE_CODE_OAUTH_TOKEN`.
- The dashboard keeps accepting only results from `main`.

## Open questions

1. Should the dashboard take the latest pull request result instead? Resolved: no; that number would describe configuration that has not merged.
