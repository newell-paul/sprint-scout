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

## As built

- The live check cannot run on this pull request. `claude-code-action` skips itself when the workflow file differs from the one on `main` ("The workflow file must exist and have identical content to the version on the repository's default branch"), so the Review job fails at Tally with no structured output. That job is not required. The first pull request after merge is the live check.
- The live check passed after merge: every pull request from #47 onward got one review per push, with its line comments attached.
