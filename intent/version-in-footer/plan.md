# Plan: version in the footer

## Files

- `apps/web/app/routes/version-badge.tsx` and `version-badge.browser.test.tsx`: the visible text becomes "SprintScout v<version>".
- `apps/web/app/routes/route-drawer.tsx`: badge removed from the header (with `brand-row`), added at the end of the footer.
- `apps/web/app/globals.css`: remove `.brand-row` and its phone rules; footer placement for `.version-badge`.
- `e2e/version.spec.ts`.
- `docs/design.md`.

## Order

1. Component test, then the component.
2. Header and footer, CSS.
3. E2E; screenshots at desktop and phone width, with Data & privacy closed and open.
4. Design entry; `pnpm check:static`, `pnpm test`, `pnpm test:component`, e2e on Chromium desktop and mobile; intent done.

## Proof

- The component and e2e tests above pass, including axe.
- `pnpm check:static` and `pnpm check:intents` pass.
- CI green, including the `@visual` screenshots. If a screenshot shifts, run the Visual baselines workflow on the branch.
