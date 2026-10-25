# Cockpit fact strip

Status: done
Opened: 25 October 2026 by Paul Newell

## Problem

The ride cockpit has three panels: the speed dial, an "Estimated segment time" panel and the wind compass. The time panel takes the widest column, but its large figure repeats the "Selected" time already shown on the chart just above. The dials, the part the owner wants to read at a glance, get the least room.

## Proposed outcome

- The cockpit is two panels, the speed dial and the wind compass, sharing the width.
- The big time goes; the chart's "Selected" figure is the one segment time on screen.
- The wind compass grows, with the wind speed read inside its ring.
- The rest of the time panel becomes a compact strip under the dials: the difference from still air, still-air time, estimated range, segment distance, exposed comparison, the modelling notes, the shelter note and the target comparison.

## Affected users and parts

`apps/web/app/components/ride-cockpit.tsx`, `time-chart.tsx` (the selected time takes the test id), `globals.css`, the cockpit component test, the cockpit and wind-preview ARIA snapshots, the e2e cockpit ARIA snapshot and the visual baselines that show the cockpit.

## Constraints

No calculation changes. Every value the time panel showed stays on screen apart from the duplicated time. The phone layout keeps the dials readable at 360 px.

## Open questions

None: the owner chose this layout over removing the panel or folding it into the speed dial.
