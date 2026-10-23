#!/bin/bash
# Passes when the intent skill loaded and no source changed before an intent existed.
cd "$EVAL_ROOT" || exit 1
node scripts/eval-skills.mjs "$TRANSCRIPT_FILE" | grep -qx intent || { echo "intent skill not loaded"; exit 1; }
[ -z "$(git status --porcelain -- apps packages)" ] || { echo "source changed before an intent"; exit 1; }
exit 0
