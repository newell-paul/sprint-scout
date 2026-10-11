#!/bin/bash
cd "$EVAL_ROOT" || exit 1
f=intent/wind-rose/intent.md
[ -f "$f" ] || { echo "missing $f"; exit 1; }
for h in "^Status: " "^## Problem" "^## Proposed outcome" "^## Affected users and parts" "^## Constraints" "^## Open questions"; do
  grep -q "$h" "$f" || { echo "missing $h"; exit 1; }
done
[ -z "$(git status --porcelain -- apps packages)" ] || { echo "source was changed"; exit 1; }
exit 0
