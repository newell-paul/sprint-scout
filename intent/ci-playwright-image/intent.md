# Run the browser jobs in Playwright's image, with timeouts

Status: done
Opened: 26 October 2026 by Paul Newell

## Problem

`playwright install --with-deps` downloads the browsers and installs about 100 system libraries with `apt-get` in every component, deploy gate and e2e job. On 26 October 2026 it hung twice (PRs #65 and #67, e2e shard 1, more than 20 minutes each) and only a cancel and re-run cleared it. No Checks job except three has `timeout-minutes`, so a hung step waits for GitHub's six-hour limit.

## Proposed outcome

The component, deploy gate and e2e jobs run in the official Playwright image for the locked Playwright version, so they install no browsers or system libraries. Every Checks job has a timeout, so a hang fails in minutes and can be re-run. The Pages deploy, which needs `gh` and stays on the runner, retries a stalled install.

## Affected users and parts

`.github/workflows/ci.yml`, `.github/workflows/pages.yml`, a script that names the image, `harness.test.ts`.

## Constraints

The image must follow the locked Playwright version, so a Dependabot bump cannot leave the browsers behind. Required check names stay the same. No new secrets and no schedules.

## Open questions

1. Which Chrome does Lighthouse use in the image? Resolved in spec.md.
