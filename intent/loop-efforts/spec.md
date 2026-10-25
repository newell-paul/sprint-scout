# Spec: loop efforts

## Behaviour

Importing a GPX ride on a loop adds one effort per complete lap. A partial lap at either end adds nothing. Riding the loop backwards adds nothing.

## Data and privacy

No change.

## Calculations

- A segment is a loop when its first and last points are within `gateM` of each other.
- On a loop the last leg is not extended past the finish, because past the finish is the next lap's first leg.
- Along-route positions are unwrapped across the seam: a drop of more than half the loop length between two samples is a crossing of the finish, not a backtrack. The finish is crossed when the unwrapped position reaches the loop length; the start is crossed when a sample just before the seam is followed by one just after it.
- After a lap finishes, the next lap is searched from the finishing pair of samples, so consecutive laps share the crossing instant.
- `effortMatchVersion` becomes `effort-match-v2`. It is not stored; point-to-point results are unchanged.
- A loop shorter than twice the distance covered between two samples cannot be unwrapped reliably; such laps are dropped rather than mistimed.

## Tests

Unit (`effort-match.test.ts`): continuous laps, a finish within the gate, joining from the exit side, a reversed loop. Property: every lap of 1 to 3 laps is found and timed to within one sample interval under bounded noise. No component, e2e or ARIA changes.

## Docs

`docs/design.md` entry "Efforts on loop segments — 25 October 2026".
