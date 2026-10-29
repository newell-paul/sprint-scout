# Plan: version label

## Files

- `apps/web/app/routes/version-badge.tsx` replaces `build-stamp.tsx`: the badge link with its accessible name and title, with its component test beside it.
- `apps/web/app/routes/route-drawer.tsx`: the `h1` and badge in a `brand-row` in the header; footer build stamp and its separator removed.
- `apps/web/app/globals.css`: `.brand-row` and `.version-badge`, with the phone layout; remove the `.build-stamp` and `.footer-wrap-dot` rules.
- `e2e/version.spec.ts`.
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
