# Spec: resolve review threads

From [intent.md](intent.md).

## Behaviour

- **`pnpm review:resolve --pr N --comment ID [--reply TEXT]`** finds the review thread on pull request N that holds comment ID (the REST comment ID, the number after `discussion_r` in a comment link), posts TEXT as a reply when given, then resolves the thread.
  - A thread already resolved is left alone and the command exits 0 without replying.
  - A comment in no thread of that pull request exits 1 and changes nothing.
  - The repository comes from `GITHUB_REPOSITORY` or `GH_REPO`, else from `gh repo view`.
- **Fix loop:** the fix job records the pull request's head before the action runs. On a `pull_request_review_comment` event, if the head has moved afterwards, a step runs the command for the triggering comment with no reply (the action has already replied). A run that pushes nothing, or that answers a top-level comment, resolves nothing.
- **By hand:** `AGENTS.md` tells an agent that fixes a review finding to reply and resolve its thread with the command, naming the commit.

## Data and privacy

GitHub API only, as the workflows already use. Nothing reaches the planner.

## Calculations

None. The dashboard's resolved share is unchanged.

## Tests

- **Unit:** `resolve-thread.test.ts` runs the script against a stub `gh` and checks the calls it makes: reply then resolve for the thread holding the comment; resolve without reply when `--reply` is absent; no mutation for a resolved thread; exit 1 for an unknown comment.
- **Harness:** `harness.test.ts` asserts the fix job's resolve step runs only on review comment events, after the head moved, with the triggering comment's ID.

## Docs

`docs/design.md`: a dated entry. `REVIEW.md`: the fix loop resolves the thread it fixed. `AGENTS.md`: the rule for hand fixes.
