# Plan: unit and component badges

## Files

- `packages/testing/src/dashboard.ts`: `badges()` gains `unit` and `component`, built by one helper from `Counts`; the no-snapshot fallback lists them too.
- `packages/testing/src/dashboard.test.ts`: the cases in spec.md.
- `README.md`: two badges before e2e, same endpoint URL pattern and dashboard link.
- `docs/sdlc.md`: the badge list names unit and component.
- `docs/design.md`: dated entry.

## Order

1. Tests first, shown failing.
2. `badges()` change until they pass.
3. README and docs, intent status `done`, `pnpm verify`.

## Proof

- New `dashboard.test.ts` cases fail before and pass after.
- After merge, the Pages run publishes `badges/unit.json` and `badges/component.json`, and the README shows both.
- `pnpm verify` green.
