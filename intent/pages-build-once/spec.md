# Spec: Pages deploys the export that passed Checks

## Behaviour

- The Checks deploy gate (`budgets`), on a push to main only, uploads `apps/web/out` as the `site` artifact after the smoke, size and Lighthouse gates pass, kept for 30 days. Pull requests and forks upload nothing.
- After a successful Checks run on a push to main in this repository, Pages downloads `site` from that run, adds the `dashboard` artifact as today, and deploys. No install, build, Chromium, smoke, size or Lighthouse step remains in `pages.yml`.
- A manual Pages run takes `site` from the newest unexpired artifact whose run is on main in this repository (`head_repository_id == repository_id`), as the dashboard lookup does, and fails with an error when there is none. It still refreshes the intent board; only that path sets up Node and pnpm.
- Pages still checks out the commit whose Checks passed; the checkout is only read by the manual intent-board refresh.
- The Pages build job's timeout drops from 20 to 10 minutes.
- Open question 1: 30 days, so a manual republish works after a month without pushes; the export is about 10 MB.

## Data and privacy

No change to what the site requests. The artifact is the same files the deploy gate served to its smoke and Lighthouse runs.

## Calculations

None.

## Tests

`harness.test.ts`:

- Pages has no `build:static`, `playwright install`, `test:smoke:static`, `test:size` or `test:lighthouse`, and downloads `--name site`.
- The deploy gate uploads `site` from `apps/web/out` only on a push to main, and after `test:lighthouse`.
- Existing tests still hold: every job has a timeout, Pages deploys only after a push to main in this repository, artifact lookups filter on the head repository.

The proof that it works is a Pages run on main after the merge, and the live site serving the new commit.

## Docs

`docs/test-strategy.md`: the static-export smoke runs in the Checks deploy gate, and Pages deploys what it tested. A dated `docs/design.md` entry.
