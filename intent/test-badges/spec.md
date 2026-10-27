# Spec: unit and component badges

## Behaviour

- `badges()` returns two more entries, written by the dashboard job as `badges/unit.json` and `badges/component.json`:
  - label "unit" or "component", message "N/T pass" where T is the total and N the total less failures;
  - colour `brightgreen` with no failures, `red` with any;
  - grey "n/a" when the snapshot has no report for that level, including older history entries that predate the field.
- README badge row, open question 1 resolved: unit, component, e2e, then coverage, mutation, Lighthouse and evals, so the test levels read bottom-up before the quality gates. Each links to the dashboard like the others.

## Data and privacy

No change. Counts come from reports the dashboard job already reads.

## Calculations

Passed = tests − failed, as for the e2e badge. Vitest has no retries here, so there is no flaky state.

## Tests

`dashboard.test.ts`:

- the full snapshot gives "unit 377/377 pass" and "component 45/45 pass", both green;
- a failed unit test turns the unit badge red with "376/377 pass";
- the existing n/a test covers the two new badges through `badges(undefined)`, and a snapshot without the fields reads n/a.

No ARIA or e2e changes.

## Docs

`docs/sdlc.md` badge list, `docs/design.md` entry "Unit and component badges — 27 October 2026".
