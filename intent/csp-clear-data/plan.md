# Plan: content security policy and clear saved data

From [spec.md](spec.md).

## Files

- `apps/web/app/csp.ts`, `csp.test.ts`: the policy and its test.
- `apps/web/app/layout.tsx`: the meta tag when `STATIC_EXPORT=1`.
- `packages/contracts/src/index.ts` and its test: `z.config({ jitless: true })`.
- `apps/web/app/routes/library.ts` and its test: `clearSavedData`.
- `apps/web/app/routes/clear-data.tsx`: the button and confirmation.
- `apps/web/app/routes/route-drawer.tsx`, `globals.css`: footer placement and copy.
- `e2e/pages/privacy.ts`, `planner.ts`, `e2e/privacy.spec.ts`: page object and tests.
- `docs/design.md`: dated entry.

## Order

1. Unit tests first, then `clearSavedData` and the policy.
2. Button, footer, e2e tests.
3. `pnpm check:deploy` to prove the policy on the static export.
4. `pnpm verify`.

## Proof

- The smoke test on the static export found Zod's eval probe; with `jitless` it records no violation.
- `pnpm check:deploy` and `pnpm verify` green.
