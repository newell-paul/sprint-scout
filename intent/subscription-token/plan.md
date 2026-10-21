# Plan: paid CI steps on the owner's subscription

From [spec.md](spec.md).

## Files

- `.github/workflows/review.yml`: both `claude-code-action` steps use `claude_code_oauth_token`.
- `.github/workflows/triage.yml`, `.github/workflows/evals.yml`: `CLAUDE_CODE_OAUTH_TOKEN` in the step environment.
- `docs/sdlc.md`, `docs/design.md`: as the spec says.
- `intent.md`: status `in build`, then `done`.

## Order

1. Workflows. 2. Docs and status.

## Proof

- `pnpm lint`, `pnpm lint:md`, `pnpm spell`, harness test (`pnpm test`).
- The review job on this pull request runs and posts its comment.
- After merge, the owner may delete the `ANTHROPIC_API_KEY` secret.
