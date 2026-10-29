# Spec: visual baselines job

From [intent.md](intent.md).

## Behaviour

- **Visual baselines** (`.github/workflows/visual-baselines.yml`) runs only on `workflow_dispatch`, with one required input: `branch`.
- It refuses `main` and any branch without an open pull request from this repository, with an error naming the reason.
- **Render job.** Runs in the image `scripts/playwright-image.sh` prints, the same one Checks uses. It checks out the branch, installs, builds `@scout/web`, then runs `playwright test --grep @visual --update-snapshots=all` with `CI=1`. The result goes up as an artifact (`e2e/__screenshots__`, kept 1 day).
- **Commit job.** Runs on `ubuntu-latest` with `contents: write` and `actions: write`. It downloads the artifact over the checkout and lists what changed under `e2e/__screenshots__` only.
  - If nothing changed, it ends with a notice "Baselines already match" and starts nothing.
  - Otherwise it commits through the Git data API with the job token, so GitHub signs the commit. The commit's parent is the branch head that was rendered. The branch ref moves without force, so the commit is refused if the branch moved meanwhile.
  - It then starts Checks on the branch with `gh workflow run ci.yml --ref <branch>`.
  - The job summary lists the files and links the commit.
- **Checks** gains a `workflow_dispatch` trigger, so a commit made with the job token still gets the required checks. The job token can't trigger `pull_request` runs. On a dispatched run, the OSV scan scans the whole lockfile, as on `main`. Every other job runs as it does for a pull request, against the branch head.
- Concurrency: one baselines run per branch at a time, without cancelling a run in progress.

## Data and privacy

No change to the app. The workflow uses only the job token.

## Calculations

`baselineTree(statusLines)` is a pure function. It maps `git status --porcelain` lines under `e2e/__screenshots__` to Git tree entries (added or modified files get a blob, deleted ones get `sha: null`). It ignores any path outside that folder.

## Tests

- Unit (`packages/testing/src/baselines.test.ts`): added, modified, deleted and renamed files, a path outside the folder is ignored, quoted paths, and empty input.
- The workflows are checked by `pnpm lint` (Prettier) and proved by a first real run on PR #94 once merged. A `workflow_dispatch` workflow can only be started once it is on `main`.

## Docs

`AGENTS.md` (Commands: how an agent starts it), `docs/test-strategy.md` (visual row), `docs/sdlc.md` (What GitHub provides), and the `docs/design.md` entry "Visual baselines job — 29 October 2026".
