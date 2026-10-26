# Spec: dashboard header in one row

## Behaviour

- Header: `<header class="top">` holds the brand link on the left and a title block on the right: the "Engineering dashboard" heading (Inter 800, 2rem, white) and the build line beneath it, right-aligned, with a hairline border below the header.
- The build line starts with a GitHub mark (inline SVG, 18 px) linking to `https://github.com/<repo>` with the accessible name "Source on GitHub", shown only when the snapshot carries a repository.
- Navigation pills: 0.95rem text, 8 px by 18 px padding, 10 px gap.
- Cards: 18 px by 20 px padding; the headline value is 1.85rem.
- Pipeline: from 900 px wide, the two pipeline cards and the runs chart share one row (1fr, 1fr, 1.6fr); narrower, the chart spans two columns as before.
- Phones (600 px and below): the title block aligns left under the brand.

## Data and privacy

No change. No scripts, no external requests; the GitHub link is navigation only.

## Calculations

None.

## Tests

`dashboard.test.ts`: the brand sits inside the one-row header; the build line links to the repository when one is known and has no link otherwise; the external-URL check allows the GitHub mark's link.

## Docs

`docs/design.md`: "Dashboard header in one row".
