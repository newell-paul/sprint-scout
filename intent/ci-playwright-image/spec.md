# Spec: Playwright image and timeouts

## Behaviour

- `scripts/playwright-image.sh` prints `mcr.microsoft.com/playwright:v<version>-noble`, with the `@playwright/test` version read from `pnpm-lock.yaml`.
- A `playwright-image` job in `ci.yml` runs the script and exposes the image as an output. `component`, `budgets` and `e2e` need it and run in that container with `--ipc=host`, as Playwright's Docker guide recommends for Chromium. Their `playwright install` steps go.
- The image has no Google Chrome, so the deploy gate points Lighthouse at Playwright's Chromium through `CHROME_PATH`, which `chrome-launcher` reads.
- Every Checks job has `timeout-minutes`: 5 for the image job, 10 for static, unit, coverage, OSV, component, the e2e report and the band switch, and 15 for the deploy gate and each e2e shard. The longest job takes about 2 minutes today.
- `pages.yml` keeps the runner, because its dashboard step uses `gh`, which the image lacks. Its build job gets a 20-minute timeout, and the install step allows itself 4 minutes with one retry.

## Data and privacy

No change. The image comes from Microsoft's registry, and its tag is pinned to the locked version.

## Calculations

None.

## Tests

`harness.test.ts`:

- every Checks job has a timeout;
- the browser jobs run in the image job's output and install no browsers;
- the script names the locked version.

Checks on the pull request prove the jobs run in the image, including Lighthouse within its budgets.

## Docs

A `docs/design.md` entry, because the CI environment for the browser suites changes.
