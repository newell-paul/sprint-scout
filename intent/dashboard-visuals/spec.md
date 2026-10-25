# Dashboard visuals: spec

## Behaviour

- **Page:** dark only (`color-scheme: dark`). Background `#0B0F19` with a soft radial wash. Surfaces `#111827`/`#0F172A`. Tones: teal `#2DD4BF` (good), orange `#F97316` (watch), red `#EF4444` (poor). A toned card has a tinted gradient, a tinted border and a glow.
- **Header:** section links are pills: Pipeline, Tests, Intent board, Quality gates, Performance, AI practice, Delivery, Slowest tests. Within band, the bands message is a green card with a tick. Drift and breach panels are unchanged apart from colours.
- **Order:** Pipeline, Tests, then a split row (on 1000 px and wider: the intent board on the left; quality gates and performance on the right), AI practice, Delivery, Slowest tests.
- **Pipeline:** first-pass success has a ring.
- **Intent board:**
  - Four columns (two below 720 px), each with a count pill. An empty column shows a dashed "Nothing here".
  - Cards: the title, a teal slug pill, the pull request pill coloured by check state, then a row with the opened date ("25 Oct 2026") and the docs text.
  - Five cards, then "+ Show N more".
- **Quality gates:** a ring per percentage, in the card's tone.
- **Performance:**
  - Lighthouse: four rings with the score inside, labelled Perf, A11y, BP and SEO. A ring is good above 90, watch from 70 and poor below 70. The text value stays for assistive technology.
  - LCP and TBT: bars against 2,500 ms and 300 ms.
  - Each bundle: a bar on a scale of 110 % of its ceiling, with a marker at the ceiling.
- **AI practice:**
  - The eval pass rate is a hero card with a model pill.
  - Intents over runs and review findings per pull request are orange area charts.
  - Fixed after review has a ring.
- **Delivery:** PR cycle time and this week's merges are stacked. Beside them, a column chart of the last eight weeks: rounded orange-to-red columns, the current week glowing, labels "−7w" to "This wk", and a dashed grid at 0, half and the top.
- **Slowest tests:** the table moves out of Tests into its own section. Project pills; a duration of 20 s or more is red.
- **Motion:** 200 ms transitions on hover and focus, and none under `prefers-reduced-motion`.
- **Phone:** one column of cards, the board in two columns, and the project column hidden in the slowest table.
- **Empty:** no delivery data shows a ghost "No pull request data". Missing values keep "n/a" and draw no chart.

## Data and privacy

No change: no scripts and no external requests. Fonts still come from `/dashboard/fonts/`.

## Calculations

None change. `ring`, `meter` and `columns` only draw values that the snapshot already holds. `bars` is replaced by `columns`. `sparkline` takes an optional `{ area, over }`.

## Tests

`dashboard.test.ts`:

- ring dash, clamping, tone and centre text;
- meter width and ceiling mark;
- column count, the lit current week, labels and the empty case;
- the area fill and the "over" wording;
- section order;
- the dark colour scheme;
- the SEO 90 ring as watch;
- the ghost column;
- the pull request pill;
- five shown cards and "+ Show 3 more".

No ARIA or visual baselines cover the dashboard.

## Docs

A `docs/design.md` entry "Dashboard visuals — 25 October 2026", and the intent-board paragraph's six becomes five.
