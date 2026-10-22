# Plan: spec drafts and band issues

From [spec.md](spec.md).

## Files

- `packages/testing/src/spec-draft.ts`: pure functions. `intentStatus`, `selectCandidates`, `specPrompt`, `validateSpec`, `unresolvedQuestions`, `pullRequestBody`.
- `packages/testing/src/spec-draft.cli.ts`: `select` reads the changed intent paths and open pull request branches, then writes the slug and prompt to `GITHUB_OUTPUT` and the summary. `open` validates, commits, pushes and opens the pull request, with the slug from `SPEC_SLUG`.
- `packages/testing/src/spec-draft.test.ts`: as the spec lists.
- `packages/testing/src/band-issue.ts`: pure functions. `breaches`, `lastInBandSha`, `bandPrompt`, `validateIntent`, `issueTitle`, `issueBody`, `matchingIssue`.
- `packages/testing/src/band-issue.cli.ts`: reads `bands.json` and `history.json`, runs `git log` for the range, calls `claude -p` with `Read,Glob,Grep`, and creates or updates the issue with `gh`. Exits 1 on a malformed draft, after posting the fallback.
- `packages/testing/src/band-issue.test.ts`: as the spec lists.
- `package.json`: scripts `spec:draft` and `band:issue`.
- `.github/workflows/spec.yml`: the draft job, the off job and the check that a pull request was opened.
- `.github/workflows/ci.yml`: a `breach` output on the dashboard job, read from `bands.json`, and a `band-issue` job with its off job.
- `packages/testing/src/harness.test.ts`: the workflow assertions from the spec.
- `docs/sdlc.md`, `docs/design.md`: as the spec says.
- `intent.md`: status `in build`, then `done`.

## Order

1. `spec-draft.ts` with its tests, then the CLI and `spec.yml`.
2. `band-issue.ts` with its tests, then the CLI and the `ci.yml` jobs.
3. Harness assertions, then a mutation check on each new test file.
4. Docs and status.

## Proof

- `pnpm test` (unit), `pnpm lint`, `pnpm typecheck`, `pnpm lint:md`, `pnpm spell`, `pnpm knip`.
- `pnpm spec:draft select` run locally against this intent's own commit range prints a skip, because `spec.md` exists.
- `pnpm band:issue --from <fixture dir> --no-post --no-agent` writes a fallback issue body.
- `pnpm verify` through the verifier agent before reporting done.
- After merge, with `SPEC_ENABLED` still off, the next push touching an intent shows the off job's summary line. The first paid run happens only when the owner turns the switch on.
