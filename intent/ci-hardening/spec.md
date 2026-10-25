# Spec: CI and dashboard hardening

From [intent.md](intent.md).

## Behaviour

- **History source:** the dashboard job reads the previous history from `newest dashboard`, the helper that already selects the newest unexpired artifact from a run on `main` in this repository. The one-off `test-health` fallback goes.
- **History required:** if `previous/history.json` is still missing, the job fails with `::error::` naming the cause. A re-run recovers from a transient API failure.
- **Upload only real history:** the `dashboard` artifact is uploaded only when `reports/dashboard/history.json` exists, so a crashed build cannot become the next baseline.
- **API reads:** `gh run list` and `gh pr list` write to a temporary file that is moved into place only on success; a failure is a `::warning::` and the cards read n/a. The collectors' failures are warnings too.
- **Failure messages:** "left its 3σ band" only when `bands.json` holds a level-3 band; a build that failed for any other reason reports "the dashboard build failed" and points at the build step.
- **Pages:** the manual path uses the same artifact query as the dashboard job. A `workflow_run` deploy checks out `workflow_run.head_sha`. A failed dashboard download fails the deploy instead of publishing the app without `/dashboard/`.
- **Badges:** a history entry with no `mutationScore` reads n/a.
- **Collectors:** listing failures exit 1 without writing; `collect-reviews` keeps only artifacts whose run's head repository is this repository, rejects tallies whose counts are not non-negative integers, and fails rather than recording a failed thread lookup as zero.
- **Guard:** `git` options before `push` (`-C dir`, `-c k=v`, `--git-dir=x`) no longer hide a push to main, and a `+` refspec counts as a force push. The env-file messages say the owner edits that file.
- **Wording:** "runs" becomes "days" in the CLI log, the sparkline's default label, `bands.ts`, `bands.yaml` and the dashboard header comment; `ci.yml` drops the in-memory planner comment; `drift.ts` is "advisory, in Checks", not "nightly".

## Data and privacy

Nothing new leaves the browser. The change narrows what CI trusts.

## Calculations

None.

## Tests

- `harness.test.ts`: the new blocked push forms; the env messages; the dashboard job reads `newest dashboard`, requires history, uploads only with history, and separates breach from crash; collectors run with warnings; Pages filters the manual path, checks out `head_sha`, and does not ignore a failed download; `collect-reviews.mjs` filters the head repository.
- `dashboard.test.ts`: badges with no `mutationScore`; the sparkline label says days.

## Docs

`docs/design.md` entry "CI and dashboard hardening — 25 October 2026"; `docs/lessons.md` entry for the fork-`main` artifact path.
