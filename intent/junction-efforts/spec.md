# Spec: junction efforts

From [intent.md](intent.md).

## Behaviour

Importing a GPX ride on a point-to-point segment adds an effort when the ride joins at the start and leaves at the finish from either side of the road, as well as when it rides straight through. The import message is unchanged. Loops are unchanged.

## Data and privacy

No change. Nothing new leaves the browser.

## Calculations

- The start and finish lines stay. A start also counts when a pair of samples passes the start point within `gateM`, with the closest approach strictly between the two samples, the first sample no more than `gateM` along the segment, and the second further along than the first. A finish also counts when a pair passes the finish point the same way, either sample at least `lengthM − gateM` along, and no finish line was crossed inside the gate.
- A pass is timed at that line's closest approach, as on loops. A line crossing keeps its linear interpolation, so rides that matched before keep their times.
- The pair that leaves the corridor or moves backwards after the finish can be the passing pair. A pair split by a gap over 60 s or one that skips the route cannot.
- Requiring the closest approach to fall strictly between the samples means a recording that starts just past the start, or stops just short of the finish, does not pass the point and yields nothing.
- `effortMatchVersion` becomes `effort-match-v3`. It is not stored.

## Tests

Unit (`effort-match.junction.test.ts`): near-side join; near-side exit; far-side join at 5 s sampling; crossing the start's junction without turning onto the segment yields nothing; a recording that stops short of the finish yields nothing. Property: joins and exits from either side, with lane offsets of 0.5 to 5 m, 1 to 5 s sampling and 5 to 15 m/s, find one effort timed within one sample interval of the time between the ride's closest approaches to the start and finish. `effort-match.test.ts`: version `effort-match-v3`. No component, e2e or ARIA changes.

## Docs

`docs/design.md`: the effort-matching paragraph describes the point gates, plus a dated entry "Efforts joined or left at a junction — 27 October 2026". `docs/lessons.md` entry for B1.
