#!/bin/bash
cd "$EVAL_ROOT" || exit 1
git diff --quiet -- apps/web/app/routes/library.test.ts || { echo "test file was edited"; exit 1; }
pnpm exec vitest run --project unit apps/web/app/routes/library.test.ts >/dev/null 2>&1
