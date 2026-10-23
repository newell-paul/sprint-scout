#!/bin/bash
# Passes when the test was added without loading the bugfix skill.
cd "$EVAL_ROOT" || exit 1
if node scripts/eval-skills.mjs "$TRANSCRIPT_FILE" | grep -qx bugfix; then echo "bugfix skill loaded for a new test"; exit 1; fi
if git diff --quiet -- apps/web/app/routes/library.test.ts; then echo "no test added"; exit 1; fi
pnpm exec vitest run --project unit apps/web/app/routes/library.test.ts >/dev/null 2>&1 || { echo "library tests fail"; exit 1; }
exit 0
