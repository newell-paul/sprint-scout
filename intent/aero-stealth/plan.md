# Plan: Aero Stealth redesign

## Delivery

- The redesign is design led, so it stays local until the owner accepts the full design. Nothing is pushed to GitHub before then.
- `aero-stealth` is a local branch cut from `main`. Each stage is one local commit on it, made after the owner checks the stage on the dev server at `http://127.0.0.1:3000` and says it is OK.
- Before each owner check, `pnpm verify` and `pnpm check:deploy` run locally.
- When the owner accepts the full design, `aero-stealth` is pushed and one pull request opens into `main`, so Checks runs once on the whole redesign. Pages deploys only after that merges.
- If `main` moves meanwhile, it is merged into `aero-stealth` (no rebase, no force-push).

## Stages and files

0. Foundations
   - `apps/web/app/fonts/`: add `inter-latin-variable.woff2`, `jetbrains-mono-latin-variable.woff2` and their OFL text; remove DM Sans and Outfit.
   - `apps/web/app/fonts.ts`: `--font-body`, `--font-mono`.
   - `apps/web/app/globals.css`: dark tokens on `:root`, radii, body background, mono numbers.
   - `apps/web/app/tokens.test.ts`: contrast pairings.
   - Owner checks: whole planner in dark colours, nothing unreadable, numbers in mono.
1. Header and segment navigation
   - `components/logo.tsx`, header markup in `route-drawer.tsx`, segment slots, units toggle, their CSS.
   - Owner checks: logo, pills, selected glow, toggle, keyboard focus.
2. Map
   - Raster paint and route layers in `route-drawer.tsx`; Start and Finish labels, arrows, wind badge; hint styles in `packages/ui/src/maplibre.ts`.
   - Owner checks: tiles readable at city and street zoom, route glow, drawing still works.
3. Timeline card
   - `components/time-chart.tsx`, `packages/ui/src/hour-chart.tsx` colours, capsules, night bands, scrub handle.
   - Owner checks: Today and Tomorrow, best hour, dry daylight filter, scrubbing.
4. Target card and the other panels
   - `target-settings`, `terrain-panel`, `efforts-panel`, `shelter-settings`, `rider-settings`, `opportunity-board`, `conditions-detail` CSS and any wrapper markup.
   - Owner checks: every panel, inputs and focus rings.
5. Analytics row
   - `components/ride-cockpit.tsx`: speed dial, estimated time card, compass.
   - Owner checks: dial and compass with live data, calm state.
6. Motion and mobile
   - Transitions, reduced motion, 360px layout.
   - Owner checks: phone width in the browser and on a device on the LAN, reduced motion on.
7. `/demo`
   - `packages/ui/src/route-map.tsx`, demo CSS; remove the light theme and its tests.
   - After the owner's first look the demo also took the planner's logo, panels, buttons and mono numbers, so it no longer looks like a different app.
   - Buttons switch their background instantly and fade only border and glow; a fading background under instantly changed text failed axe contrast mid-transition (the units toggle, then the board's Rank button that React reuses as Refresh).
   - Owner checks: `/demo` end to end.
8. Finish
   - Regenerate visual baselines with `pnpm test:visual:update` and ARIA snapshots through the runner; commit `docs/images/new-design.png`; `docs/design.md` entry; intent status done; PR from `aero-stealth` into `main`.

## Proof

Every stage: `pnpm verify` and `pnpm check:deploy` green before the owner's check. Finish: `pnpm verify`, `pnpm check:deploy`, `pnpm test:visual`, and the verifier agent on the full `aero-stealth` diff.

## As built

- Stages 3 and 4 needed no markup in `time-chart.tsx`, `maplibre.ts` or most panels; their changes sit in `globals.css`. Terrain and shelter notes got `<details>` wrappers, which changed their ARIA snapshots.
- `layout.tsx` loads the new fonts; `planner.tsx` lost the theme switch and took the shared logo.
- `e2e/drawing.spec.ts` checks the new route colour; `docs/test-strategy.md` notes the single demo theme.
- The demo's two theme baselines are orphaned and removed by hand, since `pnpm test:visual:update` only writes.
- Night bands use `rgba(59, 130, 246, 0.1)`, not the spec's 0.08; 0.08 vanished on the lighter mock-up navy.
- The demo legend copy changed with its colours ("Dashed orange: headwind", "Amber: riding direction"); copy that names a colour must follow it.
- Panels dropped their 18 px `backdrop-filter` blur after review: it blurred only the flat page colour, and in the Linux WebKit runner it made Playwright checks on the efforts, terrain and timeline controls exceed 30 seconds.
- MapLibre paint, the arrow canvases and ECharts cannot read CSS variables, so `route-map.tsx`, `route-drawer.tsx` and `hour-chart.tsx` repeat token values as hex.

## Follow-up

`/demo` is unlinked, absent from the Pages build, and lost its MCP role on 22 Sep 2026. The owner asked (24 Oct 2026) to remove it, with its tests, synthetic API and docs, as a separate intent after this redesign merges.
