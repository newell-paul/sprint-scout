# Spec: pull request review and fix loop

From `intent.md` (accepted 10 October 2026).

## Behaviour

**Review.** The `Review` workflow runs on `pull_request` (opened, synchronize, reopened, ready for review). The review job runs when all hold: the repository variable `REVIEW_ENABLED` is `true`, the pull request is not a draft, its head is in this repository, and the actor is not Dependabot. Otherwise a free job writes one line to the job summary saying why the review was skipped.

The job runs `anthropics/claude-code-action@v1` with a prompt that names the repository and pull request, tells the reviewer to read `REVIEW.md` and follow its three passes, severities, exclusions and output, to read `intent/<slug>/plan.md` when the pull request body or title names one, and to post:

- one inline comment per Blocker, Major or Minor finding on the line concerned, through the action's inline comment tool;
- one summary comment (sticky, so a new push edits it rather than adding another) with findings grouped by severity and the tally line;
- no approval, no request for changes, no merge.

The run returns structured output: counts of blocker, major, minor and nit findings, the number of inline comments posted, and a one-sentence verdict. A deterministic step turns that into `reports/review/tally.json` with the pull request number, head SHA, run id, model and time, writes `summary.md` to the job summary, and uploads both as the `review-report` artifact (90 days). A missing or malformed structured output fails that step so the gap is visible; the workflow is not a required check, so it never blocks a merge.

Model: the repository variable `REVIEW_MODEL`, default `claude-sonnet-5-5`. Turn budget 30. Tools: the inline comment tool, `gh pr diff`, `gh pr view`, `gh pr comment`, read-only file tools and `pnpm test` for confirming a suspicion. No file edits, no pushes.

**Fix loop.** The same workflow runs on `issue_comment` and `pull_request_review_comment` when the comment is on a pull request and contains `@claude`. The action runs in its tag mode: it reads the thread, makes the change on the pull request branch, runs the relevant checks and reports in its tracking comment. A system prompt appendix states the repository rules: follow `AGENTS.md`, push to the pull request branch only, never to `main`, never trigger a workflow, never touch baselines or env files. The repository's `.claude/settings.json` is restored from the base branch by the action, so the guard hook also runs inside it. Tools: `pnpm install`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, the vitest, eslint and prettier executables.

Only users with write access trigger either job; the action enforces that.

**Dashboard.** The Checks dashboard job runs `scripts/collect-reviews.mjs`, which lists the last 30 `review-report` artifacts, keeps the latest tally per pull request, reads each pull request's review threads through GraphQL, and writes `reports/review/reviews.json`. The dashboard CLI accepts `--reviews`; `reviewSummary` adds `review` to the snapshot: findings by severity over the last 20 reviewed pull requests, the share of reviewer threads resolved, the number of pull requests, and the total per pull request for a bar chart. The two AI practice cards that read "not collected yet" show these.

**Empty, error and mobile states.** No artifacts: the collector writes an empty array and the cards stay at n/a. GraphQL failure for one pull request: threads counted as zero for it, the rest unaffected. The dashboard layout is unchanged.

## Data and privacy

The action receives the diff, the pull request text and the repository files, as any reviewer does. The API key is a repository secret and never reaches a fork, because fork pull requests are skipped. The GitHub token is the Claude GitHub App's installation token, scoped to this repository, so a fix push triggers Checks (a push with the job token would not). No Strava data exists in the repository. Nothing leaves the browser: this is all server-side CI.

## Calculations

- Tally: non-negative integers per severity, validated; the total is their sum.
- Resolved share: resolved reviewer threads over reviewer threads across the window, in percent; null when there are no threads.
- Window: the last 20 reviewed pull requests by number.

All in `packages/testing/src/review.ts` and `dashboard.ts`, pure and unit tested.

## Tests

- Unit: `review.test.ts` covers `parseFindings` (valid, missing key, negative, non-integer, non-JSON), `tallyMarkdown`, and `reviewSummary` (window, share, nulls). `dashboard.test.ts` gains the review cards. `harness.test.ts` asserts that no workflow has a `schedule` trigger and that the review workflow is behind the variable and skips forks.
- No component or e2e change; no ARIA snapshot changes.

## Docs

`REVIEW.md` gains an "Automation" paragraph. `docs/sdlc.md` marks the two rows and step 11 done. `docs/design.md` gets "Pull request review and fix loop — 10 October 2026".
