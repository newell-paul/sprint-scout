# Intent board on the dashboard

Status: done
Opened: 24 October 2026 by the owner

## Problem

The owner wants a visual overview of work in flight. The engineering dashboard lists intents as a plain table of slug, status and opened date. It shows only what is on `main`, and an intent reaches `main` in the same pull request as its code. So every intent there is already `done`: on 24 October all fourteen were. Work being specced, planned or built is invisible until it has shipped.

A GitHub Project board would need a personal access token with project scope, which is a new secret, and a sync that could disagree with the `intent.md` files, which are the record.

## Proposed outcome

- The dashboard has a board section with columns Draft, Accepted, In build and Done. Dropped intents are listed folded under the board.
- Each card shows:
  - the intent's title and opened date;
  - whether `spec.md` and `plan.md` exist;
  - its pull request, if any, with that pull request's check state;
  - a link to the folder on GitHub.
- Intents on open pull request branches appear as well as those on `main`, so work in flight is visible. An intent on an open branch counts as In build once it has a plan, whatever its status line says.
- The board is built only from the `intent.md` files and pull request data. No status is stored anywhere else.

## Affected users and parts

- Owner and readers of the published dashboard.
- `packages/testing/src/dashboard.ts`, `dashboard.cli.ts` and their tests.
- `.github/workflows/ci.yml`: the dashboard job collects intent files from open pull request branches.
- `docs/design.md`, `docs/sdlc.md`.

## Constraints

- No new secrets; the dashboard job's existing token only. Accepted on 24 October 2026: the job gains `checks: read` and `statuses: read`, both read-only, for each pull request's check state.
- No schedules. The board refreshes when the dashboard does, on a push to `main`.
- Static HTML with no scripts, light and dark, as the rest of the dashboard.
- Deterministic and tested; card order is stable.

## Open questions

1. Is a board that refreshes only on pushes to `main` fresh enough? Open pull requests change between pushes, so the board can lag by hours. Resolved: yes for now. A rebuild on pull request events would deploy Pages from pull request activity, which the current setup deliberately avoids.
2. Should an intent appear on the board while it exists only on a local branch with no pull request? Resolved: no; it appears once a pull request is open, even as a draft.
