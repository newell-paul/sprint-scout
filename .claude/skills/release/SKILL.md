---
name: release
description: Publish or roll back the planner on GitHub Pages. Use when the owner asks to publish, release, deploy, revert or roll back.
---

# Release and rollback

Everything reaches `main` by pull request. When the owner asks, an agent merges a pull request whose Checks are green, or re-runs the Pages workflow. A hook still blocks `git push` to `main` and force pushes.

## First publish

1. `pnpm verify` green on the staged tree.
2. Owner commits and runs `gh repo create sprint-scout --public --source . --push`.
3. Owner runs `gh api -X POST repos/<login>/sprint-scout/pages -f build_type=workflows` once.
4. Owner enables branch protection on `main`: require the Checks workflow, require a pull request, no force pushes.
5. Checks runs on the push; Pages deploys when Checks succeeds.

## Routine release

Work lands on `main` by pull request. A green Checks run on `main` triggers the Pages workflow. Nothing else to do.

## Rollback

1. `git revert <sha>` on a branch, open a pull request, let Checks run.
2. Merge; Pages redeploys the reverted site after Checks.
3. Append the cause to `docs/lessons.md` and add a test that would have caught it.

There is no rollback API for Pages worth wrapping; the revert through the normal gate is the rollback.
