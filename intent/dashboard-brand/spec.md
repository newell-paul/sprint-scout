# Spec: Dashboard brand

## Behaviour

- The header starts with the planner's mark (the two teal chevrons and the wind line) and the "Sprint Scout" wordmark, linked to the planner at `../`. The link's accessible name is "SprintScout planner"; the mark is decorative.
- The logo sits on its own row above the header. The `h1` becomes "Engineering dashboard", since the wordmark already names the product; the page title stays "SprintScout engineering dashboard".
- Body text is Inter; headings are Inter at weight 800; `code`, numbers in table cells and card values are JetBrains Mono.
- In light mode the mark and wordmark accent use darker teal and blue so the wordmark keeps 4.5:1 contrast. Dark mode uses the planner's `--data` and `--wind` colours.

## Data and privacy

The fonts load from `fonts/` next to `index.html`. Nothing leaves the origin; the page still has no scripts.

## Calculations

None.

## Tests

`dashboard.test.ts`: the rendered page declares both `@font-face` rules with relative `fonts/` URLs, has no absolute URL in its styles, and links the logo to `../` with its accessible name. No e2e or ARIA snapshot covers the dashboard.

## Docs

No `docs/design.md` entry: the change is visual only.
