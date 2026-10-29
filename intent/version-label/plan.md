# Plan: version label

## Files

- `apps/web/app/routes/build-stamp.tsx`: render the badge link with its accessible name and title. Rename the component to `VersionBadge` in `version-badge.tsx`, with its test beside it.
- `apps/web/app/routes/route-drawer.tsx`: badge after the `h1` in the header; footer build stamp and its separator removed.
- `apps/web/app/globals.css`: `.version-badge`; remove the `.build-stamp` and `.footer-wrap-dot` rules; the heading's auto margin moves to the badge.
- `e2e/version.spec.ts` with a small page-object addition.
- `docs/design.md`.

## Order

1. Component test first, then the component.
2. Header and footer wiring, CSS.
3. E2E; screenshots at desktop and phone width.
4. Design entry, `pnpm verify`, intent done.

## Proof

- `pnpm test:component` and the new e2e spec pass, including axe.
- `pnpm check:static` and `pnpm check:intents` pass.
- `pnpm verify` green.
