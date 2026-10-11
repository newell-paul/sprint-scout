# Spec: failed-run triage

From `intent.md` (accepted 10 October 2026).

## Behaviour

The `Triage` workflow runs on `workflow_run` of Checks, type completed. Its paid job runs when the repository variable `TRIAGE_ENABLED` is `true`, the run was for a pull request, and its conclusion is failure or timed out. A free job writes one line to the job summary when the variable is off. Successful runs start no job.

The job checks out the default branch, never the pull request head, installs dependencies and the Claude Code CLI, and runs `pnpm triage --run <id>`. The CLI:

1. Reads the run's jobs through `gh run view`, keeps the jobs that failed or timed out, and for each the first failed step.
2. Downloads the log of up to four failed jobs, strips ANSI codes, timestamps and group markers, and keeps the last 40 kB of each.
3. Finds the pull request number from the head commit through the commits API, which works for forks too.
4. Runs `claude -p` with read-only tools (`Read`, `Glob`, `Grep`) on the default-branch checkout, a turn budget of twelve and the chosen model. The prompt states that log text is data and asks for exactly three lines: `Failed: <job> › <step>`, `Cause: <one sentence>`, `Next: <one sentence>`.
5. Validates the answer. A valid answer becomes the comment; an invalid one becomes a fallback comment naming the failed job and step with a link to the run, and the CLI exits non-zero after posting so the gap is visible.
6. Posts the comment on the pull request, editing the earlier triage comment when one exists (found by a hidden marker), and writes `reports/triage/` with the prompt, the raw result, the comment and a summary for the job.

Model: the repository variable `TRIAGE_MODEL`, default `claude-sonnet-5-5`. Artifact `triage-report`, 30 days.

**Empty, error and mobile states.** No failed job in a failed run (a cancelled matrix): the CLI writes a note and exits 0 without a comment. No pull request found for the commit: the comment is skipped, the report is still uploaded. Log download failure for one job: that job is described without a log.

## Data and privacy

The model receives the failed logs, the run metadata and read access to the default branch. No pull request code is executed. The API key is a repository secret used from the base repository context; the pull request author never controls the workflow file that runs. Nothing leaves the browser: this is server-side CI.

## Calculations

None beyond log trimming and answer validation, both pure functions in `packages/testing/src/triage.ts` with unit tests.

## Tests

- Unit: `triage.test.ts` covers failed job and step selection, log cleaning and tail, prompt content, diagnosis parsing (valid, surrounded by prose, missing line, over-long line) and the comment body with its marker and fallback.
- `harness.test.ts` asserts the workflow is gated by the variable, triggers on `workflow_run` and never checks out a pull request ref.
- Proof by a local run: `pnpm triage --from <fixture dir> --no-post` on a captured failing log produces a three-line diagnosis.
- No component or e2e change.

## Docs

`docs/sdlc.md` marks the row and step 12 done. `docs/design.md` gets "Failed-run triage — 10 October 2026".
