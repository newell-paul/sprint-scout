# Wind on/off toggle on the map

Status: done
Opened: 27 October 2026 by Paul Newell

## Problem

The map's top-left corner carries a chip with the wind arrow, speed and direction ("19.4 km/h · north-east"). The cockpit beneath already shows the same speed and direction, so the chip repeats it over the part of the map the rider is looking at. The control that turns the wind particles off sits far below, in the forecast console, with a caption ("Arrow points where wind blows.") that only explains the chip.

## Proposed outcome

The chip is gone. In its corner sits a small text chip, "Wind on" or "Wind off" beside a status dot, that turns the wind particles on and off. It stays discreet on desktop and phones, while a phone tap still lands on it comfortably. The particles button and its caption in the forecast console are gone.

## Affected users and parts

`apps/web/app/routes/wind-preview.tsx`, `apps/web/app/globals.css`, the wind preview component tests and their ARIA baselines, `e2e/forecast.spec.ts`, `e2e/faults.spec.ts`, `e2e/pages/map.ts`, `docs/design.md`.

## Constraints

No new network requests. The toggle is a real button: keyboard reachable, its state announced, a tap target of at least 44 px. Pressing it must not drop a route point or pan the map. Reduced motion still keeps the particle field static.

## Open questions

None; the owner chose option D from four styles mocked on the map on 27 October 2026.
