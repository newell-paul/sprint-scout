# Plan: Evals on main for the dashboard

From [spec.md](spec.md).

## Files

- `.github/workflows/evals.yml`: `push` to `main` with the configuration paths; the paid job and the "off" job treat a push like a same-repository pull request.
- `docs/sdlc.md`, `docs/design.md`.

## Order

1. Dispatch the Evals workflow on `main` (owner asked).
2. Add the push trigger and job conditions.
3. Docs.

## Proof

- The dispatched run on `main` passes and uploads `evals-report`; the next dashboard build shows it.
- This pull request changes `evals.yml`, so after merge the push to `main` starts an Evals run there.
- Prettier, markdownlint and CSpell clean.
