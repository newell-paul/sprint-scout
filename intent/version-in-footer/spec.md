# Spec: version in the footer

From [intent.md](intent.md). Option 2.

## Behaviour

- The footer reads "© OpenStreetMap contributors · Data & privacy", then the teal pill "SprintScout v0.9.0".
  - On desktop, the pill sits at the right end of the row.
  - On a phone, when the row wraps, it starts the next line at the left.
  - It links to the version's GitHub release. Its tooltip is "Build 659ec4d". Its accessible name is "SprintScout v0.9.0, build 659ec4d", which includes the visible text. Without a commit, both read "SprintScout v0.9.0". Without a version, nothing renders.
- The pill keeps the header badge's look: teal text on a faint teal fill, teal outline, fully rounded, 12 px semibold, a 44 px tall touch target, and a stronger outline and fill on hover and focus.
- The header loses the badge and its `brand-row` wrapper. The heading and unit switch go back to how they were before `version-label`.
- Opening Data & privacy still shows its text and the Clear data control across the footer's width. The pill sits after it.

## Data and privacy

No change.

## Calculations

None.

## Tests

- Component (`version-badge.browser.test.tsx`): the visible text is "SprintScout v0.9.0"; the name, title and href with and without a commit; nothing without a version; axe passes.
- E2E (`version.spec.ts`, `@a11y @mobile`): the pill is in the footer with its link, the header has no version, and there's no horizontal overflow.

## Docs

`docs/design.md` entry "Version back in the footer — 29 October 2026", superseding "Version badge in the header".
