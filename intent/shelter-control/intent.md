# Shelter as one segmented control

Status: done
Opened: 27 October 2026 by Paul Newell

## Problem

"Assumed shelter" is three separate square buttons, each with an icon, a label and "N% wind reduction". On desktop they stretch into three wide cards; on phones the percentages wrap to two lines. The owner's reference is a single segmented control, which reads as one setting with three positions and takes less room.

## Proposed outcome

Exposed, Sheltered and Dense sit in one control, the chosen one clearly marked, with the wind reduction still visible for the chosen level. Three mock-ups were shown on 27 October 2026:

1. Segmented slider: one pill track with icon and label in each segment, the chosen one outlined in glowing teal; the percentages beneath, the chosen one in full.
2. Compact pill: one 44 px row like the km/h–mph switch, the chosen segment filled teal; a line beneath names the level and its reduction. Phones show labels without icons.
3. Notched slider: a rail with three stops, icons above and labels with percentages below; the teal fill grows with shelter and the chosen stop glows.

Whichever is chosen, it keeps the current behaviour: one press saves the level, the save-failure alert, the "How shelter is applied" notes, and keyboard and screen-reader access (three buttons with `aria-pressed` in the "Shelter level" group, each tap target at least 44 px).

## Affected users and parts

`apps/web/app/routes/shelter-settings.tsx`, `apps/web/app/globals.css` (`.shelter-*`), `shelter-settings.browser.test.tsx` and its ARIA baseline if the text changes, the e2e shelter page object if labels move. `docs/design.md`.

## Constraints

No change to the shelter presets, the maths or what is stored. Text keeps AA contrast; the chosen state is never shown by colour alone (outline, fill or stop size as well).

## Open questions

1. Which of the three options? Resolved: option 1, the segmented slider.
