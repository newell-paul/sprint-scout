# Efforts joined or left at a junction

Status: accepted
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
