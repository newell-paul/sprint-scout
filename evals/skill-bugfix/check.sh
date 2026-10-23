#!/bin/bash
# Passes when the bugfix skill loaded and the library tests pass.
cd "$EVAL_ROOT" || exit 1
node scripts/eval-skills.mjs "$TRANSCRIPT_FILE" | grep -qx bugfix || { echo "bugfix skill not loaded"; exit 1; }
pnpm exec vitest run --project unit apps/web/app/routes/library.test.ts >/dev/null 2>&1 || { echo "library tests fail"; exit 1; }
exit 0
