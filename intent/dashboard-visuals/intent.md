# Dashboard visuals

Status: done
Opened: 25 October 2026 by Paul Newell

## Problem

The engineering dashboard is a page of numbers in plain cards, and only some of them have a small line chart. It's the public face of the repository as an AI-native showcase, but it looks like an internal report next to the Aero Stealth planner. Designs: `docs/images/dashboard-update.png` (top half) and `docs/images/dashboard-charts.png` (bottom half).

## Proposed outcome

- The page uses the Aero Stealth dark palette: background `#0B0F19`, teal `#2DD4BF` for healthy, orange `#F97316` for attention and red `#EF4444` for poor. Cards that need attention glow in their tone.
- Section links are pills. A green alert card with a tick shows when every metric is within its band.
- **Intent board:** compact Kanban columns with count pills. An empty column shows a dashed ghost. Each card has a teal slug pill and a muted row with the date and the docs. A column shows 5 cards, then "+ Show N more".
- **Intent board and quality gates:** sit side by side on wide screens, with performance under the quality gates.
- **Quality gates:** each percentage has a ring, teal or in its warning tone.
- **Performance:**
  - Lighthouse shows four small glowing rings: Perf, A11y, BP and SEO.
  - LCP and TBT have micro progress bars against their budgets.
  - Client JavaScript has a bar against its ceiling, with a marker at the ceiling.
- **AI practice:**
  - The eval pass rate is a glowing hero card with a model pill.
  - Intents and review findings use orange area charts.
  - Fixed after review has a ring.
- **Delivery:** PR cycle time and merges this week are stacked on the left. On the right, merges per week is a column chart with rounded orange-to-red columns, the current week glowing, soft grid lines and week labels.
- **Slowest tests:** project pills, with durations of 20 s or more in red.
- Hover and focus have 200 ms transitions, and none run under reduced motion.

## Affected users and parts

- `packages/testing/src/dashboard.ts`: markup, the styles and the new SVG helpers `ring`, `meter` and `columns`. `sparkline` gets an optional area fill.
- `packages/testing/src/dashboard.test.ts`.
- No calculations change: `snapshot`, `summarise`, the tones, the bands and the badges stay as they are.

## Constraints

- The page stays static: no scripts, no external requests, and fonts from `/dashboard/fonts/`.
- Every chart has a text equivalent (`role="img"` with an `aria-label`), and the values stay in `dt`/`dd`.
- Text meets 4.5:1 contrast on the dark background.
- The brief assumes React and Tailwind. The dashboard is HTML generated in TypeScript with inline CSS, so the design is translated to that, not ported.

## Open questions

Resolved by the owner on 25 October 2026 after reviewing the mock-up, which also moved the slowest-tests table to its own section at the end:

1. Dark only: yes.
2. Lighthouse ring tones follow the design (only above 90 is green); the card tone and the badge keep their rule.
3. LCP keeps its 2,500 ms budget.
4. The intent board sits beside the quality gates.
