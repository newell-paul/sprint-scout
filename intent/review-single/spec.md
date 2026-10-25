# Spec: One review per pull request

## Behaviour

- The reviewer returns, as structured output, the counts per severity, a verdict, `body` (the summary in the REVIEW.md format, ending with the tally line) and `comments`: one `{ path, line, body }` per Blocker, Major and Minor finding, in the REVIEW.md inline format.
- A step after the tally posts one review with event `COMMENT` on the reviewed head commit: `body` as the review body, `comments` on the right-hand side of the diff.
- If GitHub rejects the review (a comment on a line outside the diff answers 422), the step posts the same review with no inline comments and their text added to the body under "Not placed on the diff". The owner still gets one email.
- A comment with a missing path, a line that is not a positive integer or an empty body is moved into the body the same way, before posting.
- The review is posted by `github-actions[bot]` instead of `claude[bot]`, because it uses the job token.
- With no findings, the review is the body alone.

## Data and privacy

Nothing new leaves GitHub. The agent keeps its read tools (`gh pr diff`, `gh pr view`, `pnpm test`, Read, Glob, Grep) and loses the inline-comment tool and `gh pr comment`.

## Calculations

`inline` in the tally is the number of comments placed on the diff in the payload, no longer a count the model reports.

## Tests

`review.test.ts`:

- `parseFindings` reads `body` and `comments`, and still accepts the old shape;
- `reviewPayloads` builds the review and its fallback, moves invalid comments into the body, and returns nothing when there is no body.

## Docs

`REVIEW.md` "Output" and the workflow paragraph describe one review. `docs/design.md` gets a dated entry, since the 10 October entry describes two posts; the `docs/sdlc.md` step 11 row changes to match.
