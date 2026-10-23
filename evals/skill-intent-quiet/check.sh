#!/bin/bash
# Passes when the typo is fixed without loading the intent skill or opening an intent.
cd "$EVAL_ROOT" || exit 1
if node scripts/eval-skills.mjs "$TRANSCRIPT_FILE" | grep -qx intent; then echo "intent skill loaded for a typo"; exit 1; fi
if grep -q determinstic docs/test-strategy.md; then echo "typo not fixed"; exit 1; fi
[ -z "$(git status --porcelain -- intent)" ] || { echo "intent folder created for a typo"; exit 1; }
exit 0
