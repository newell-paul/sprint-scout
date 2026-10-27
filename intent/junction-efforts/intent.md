# Efforts joined or left at a junction

Status: dropped
Opened: 27 October 2026 by Paul Newell

## Problem

A shotgun pass on 27 October 2026 (B1) found that a point-to-point segment drawn from junction to junction misses efforts that turn onto it at the start, or off it at the finish, on the near side of the road (a left turn in the UK). The rider passes within 3 to 5 m of the start and finish and follows the segment, yet the import says "No traversal of this segment found". The start gate needs a sample behind the start line, and a near-side turn is already a lane ahead of it; the finish needs a sample past the finish line, and a near-side exit stays a lane short of it. Probing a 500 m segment: clean near-side joins and exits gave 0 efforts; under 3 m noise they were found 11 to 31 times in 40. Far-side turns are found at 1 s sampling but drop to 13 in 20 at 5 s and 4 in 20 at 8 s.

## Proposed outcome

A ride that passes within the 25 m gate of a point-to-point segment's start, follows the segment and passes within the gate of its finish is an effort, whichever side it joins or leaves from. Rides that already match keep the same times. A ride that only crosses the start's junction, joins part way along, or stops short of the finish still yields nothing.

## Affected users and parts

`packages/analysis/src/effort-match.ts` and its tests; `docs/design.md`, `docs/lessons.md`.

## Constraints

Pure and deterministic, 100 % coverage in `packages/analysis`, property tests with the fixed seed. No change to stored data; efforts already saved stay valid. Loops match exactly as before.

## Open questions

None.

## Dropped

Dropped on 27 October 2026 by the owner. SprintScout's segments are mostly straight sprints, not junction-to-junction or loops. Comparing the matcher before and after the drafted fix on 4,800 straight rides (150 m to 1 km segments; 6 to 17 m/s; 1 to 5 s sampling; 0 to 10 m noise; 0 to 4 m lane offset) gave identical efforts for every ride, so the fix had nothing to improve for them. It also made rides that took a side road within about 24 m of either end count, skipping that distance: 2.1 to 2.5 s fast at one end and 4.6 s at both on a 500 m segment at 8 m/s, which could set a false best on a short sprint. On 1,200 noisy far-side junction rides it moved 5 matched efforts' starts onto the approach road, 1.3 to 4 s slow. The matcher stays at `effort-match-v2`; the failing tests are reverted.
