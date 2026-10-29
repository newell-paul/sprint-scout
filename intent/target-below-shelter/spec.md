# Spec: target below shelter

From [intent.md](intent.md).

## Behaviour

- In the forecast console, "Segment target" follows "Assumed shelter" and comes before terrain and efforts. It still shows whether or not the forecast has loaded.
- The target field's placeholder is `1:00`. Parsing, validation, saving and removal are unchanged.

## Data and privacy

No change.

## Calculations

None.

## Tests

- Component ARIA baselines for `target-settings` and `wind-preview` change order and placeholder; the runner regenerates them.
- The existing target unit, component and e2e tests pass unchanged.

## Docs

`docs/design.md` entry "Target below shelter — 29 October 2026".
