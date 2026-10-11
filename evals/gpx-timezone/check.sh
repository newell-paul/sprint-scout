#!/bin/bash
cd "$EVAL_ROOT" || exit 1
git diff --quiet -- packages/application/src/gpx.test.ts || { echo "test file was edited"; exit 1; }
pnpm exec vitest run --project unit packages/application/src/gpx.test.ts >/dev/null 2>&1
