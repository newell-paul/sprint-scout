#!/bin/bash
# Passes when the section was added without loading the release skill.
cd "$EVAL_ROOT" || exit 1
if node scripts/eval-skills.mjs "$TRANSCRIPT_FILE" | grep -qx release; then echo "release skill loaded for a README edit"; exit 1; fi
grep -q '^## Run locally' README.md || { echo "section not added"; exit 1; }
exit 0
