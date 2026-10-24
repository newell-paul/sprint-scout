# Spec: Evals on main for the dashboard

From [intent.md](intent.md).

## Behaviour

- The Evals workflow also runs on a push to `main` that changes the same paths as its pull request trigger: `AGENTS.md`, `REVIEW.md`, `.claude/**`, `evals/**`, `intent/README.md`, the two runner scripts and the workflow itself.
- On that push the free harness runs, then the paid agent tasks when `EVALS_ENABLED` is `true`, and the run uploads `evals-report` as before. With the switch off, the "Agent tasks (off)" job explains why, as on pull requests.
- The dashboard job already takes the newest unexpired `evals-report` from `main`. A merge starts Checks and Evals together and the paid tasks take minutes, so the new result usually appears at the next push to `main`, not the merge's own.
- A result stays on the dashboard until a newer `main` run replaces it or the artifact expires after 90 days.
- One run is dispatched by hand on `main` on 24 October 2026 so the card is filled at once.

## Data and privacy

No change for the planner. The paid tasks use `CLAUDE_CODE_OAUTH_TOKEN` as on pull requests; no new secret, permission or schedule.

## Calculations

None.

## Tests

The workflow change has no unit test of its own. Proof is the dispatched run on `main`, then the next merge that touches the configuration starting an Evals run on `main`.

## Docs

- `docs/sdlc.md`: the evals trigger list and the continuous-evals row.
- `docs/design.md`: dated entry "Evals on main for the dashboard — 24 October 2026".
