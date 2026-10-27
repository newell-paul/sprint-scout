# Spec: shelter as one segmented control

## Behaviour

- "Assumed shelter" shows one pill track, option 1 of three mock-ups. Each of its three segments holds the level's icon and label (Exposed, Sheltered, Dense).
- The chosen segment is outlined in teal with a soft glow, a faint teal fill and a brighter icon; the others are muted with no outline. Outline and fill, not colour alone, mark it.
- Beneath each segment sits its wind reduction: the chosen one in full and white ("65% wind reduction"), the others as the bare percentage in muted grey ("0%", "35%").
- Each segment is a button at least 44 px tall; pressing it saves the level as today. A refused save shows the same alert and keeps the previous level. The "How shelter is applied" notes are unchanged.
- Phones: the same track at full width; icons and labels stay; the chosen caption may wrap to two lines.

## Data and privacy

No change.

## Calculations

None; the presets and their percentages come from `shelterPresets` as today.

## Tests

- The percentage stays inside each button, with " wind reduction" visually hidden on the unchosen ones, so each button's accessible name is unchanged ("Sheltered 35% wind reduction"). The e2e page object, the component tests and the three ARIA baselines need no change; the runner confirms the baselines.
- Component: a new test that the unchosen captions show only the percentage while the full wording stays in the button's name, and the chosen one shows it in full.
- Owner checks the control on the dev server at desktop and phone width.

## Docs

`docs/design.md` entry "Shelter as one segmented control — 27 October 2026".
