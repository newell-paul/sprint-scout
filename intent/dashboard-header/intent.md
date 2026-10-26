# Dashboard header in one row

Status: accepted
Opened: 26 October 2026 by Paul Newell

## Problem

The engineering dashboard stacks the SprintScout wordmark, the "Engineering dashboard" heading and the build line down the left, which spends the first screen on the header. The navigation pills are small, the card numbers are smaller than the mock-up the owner shared on 26 October 2026, and the "Last 30 runs" card drops to its own row at laptop widths, leaving the pipeline section half empty.

## Proposed outcome

The wordmark sits on the left and the heading with the build line on the right, in one row with a hairline beneath it. The build line opens with a GitHub mark linking to the repository. The pills, card padding and card numbers are larger. From 900 px wide the runs chart shares a row with the two pipeline cards. On phones the header stacks and reads left to right as before.

## Affected users and parts

`packages/testing/src/dashboard.ts` (markup and stylesheet), `packages/testing/src/dashboard.test.ts`, `docs/design.md`. The planner is unchanged.

## Constraints

The dashboard stays a static page with no scripts and no external requests; the GitHub mark is an inline SVG and the link is a plain anchor. Fonts stay self-hosted (Inter and JetBrains Mono).

## Open questions

None; the owner chose the bold Inter heading in white over four alternatives on a local preview.
