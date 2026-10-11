---
name: bugfix
description: Fix a reported bug test-first. Use when the owner reports broken behaviour; writes the failing test, commits it, then fixes without touching tests, and records the lesson.
---

# Bug fix, test first

1. Reproduce: write the smallest failing test at the lowest level that can prove the bug (unit before component before e2e). Run it and confirm it fails for the reported reason.
2. Commit the failing test on its own when the owner has asked for commits; otherwise stage it.
3. Lock tests: `mkdir -p .claude/state && touch .claude/state/fixing`. While the marker exists a hook blocks edits to `*.test.ts`, `*.spec.ts`, `__aria__` and `__screenshots__`.
4. Fix the code until the test passes. If the test itself was wrong, remove the marker, say so, fix the test, and put the marker back.
5. Unlock: `rm .claude/state/fixing`.
6. Run `pnpm verify`.
7. Append to `docs/lessons.md`: date, what broke, where it was found, the test that now catches it, and the rule for `AGENTS.md` if the same class of mistake has now happened twice.
