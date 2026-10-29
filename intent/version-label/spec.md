# Spec: version label

From [intent.md](intent.md). Option D.

## Behaviour

- The header shows a small pill right after the wordmark heading, reading `v0.9.0`: teal text (`--data`) on a faint teal fill with a teal outline, fully rounded, 12 px semibold, upright (not slanted like the wordmark). It links to the version's GitHub release.
- Its accessible name is "SprintScout v0.9.0, build 659ec4d", which includes the visible text. Its tooltip (`title`) is "Build 659ec4d". Without a commit, they read "SprintScout v0.9.0" and "SprintScout v0.9.0". Without a version, nothing renders.
- The heading's accessible name stays "SprintScout". The unit switch keeps its place at the right of the header.
- The footer loses the build stamp and its separator. It reads "© OpenStreetMap contributors · Data & privacy" on every width.
- Up to 600 px wide, the badge drops under the word "Sprint" so the unit switch keeps the first row beside the logo, with no horizontal overflow. Logo, badge and unit switch don't fit one row on a phone. The badge has a 44 px tall touch target, made by padding around a smaller visible pill.

## Data and privacy

No change. Both values are baked in at build time, and the link is ordinary navigation on click.

## Calculations

None.

## Tests

- Component (`build-stamp.browser.test.tsx`): the link's name, href and title with and without a commit; nothing without a version; axe passes.
- E2E: a header check that the badge links to the release and the footer no longer contains a version, on desktop and mobile, with no horizontal overflow on the phone.

## Docs

`docs/design.md` entry "Version badge in the header — 29 October 2026".
