# Plan: One review per pull request

From [spec.md](spec.md).

## Files

- `packages/testing/src/review.ts`: `parseFindings` reads `body` and `comments`; new `reviewPayloads`.
- `packages/testing/src/review.cli.ts`: also writes `review.json` and `review-fallback.json`.
- `packages/testing/src/review.test.ts`: tests first.
- `.github/workflows/review.yml`: the prompt asks for the review in structured output; the schema gains `body` and `comments`; the posting tools go; a "Post the review" step follows the tally.
- `REVIEW.md`: the Output section and the workflow paragraph.
- `docs/design.md`: a dated entry. `docs/sdlc.md`: the step 11 row.

## Order

1. The tests fail.
2. `review.ts` and the CLI; the tests pass.
3. The workflow and `REVIEW.md`.

## Proof

- The new tests fail first, then pass.
- `actionlint`, if installed, is clean on `review.yml`. `pnpm verify` is green.
- On this pull request, the review arrives as one review with its comments attached, and a single email.
