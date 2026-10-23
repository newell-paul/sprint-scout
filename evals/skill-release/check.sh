#!/bin/bash
# Passes when the release skill loaded and nothing reached main.
cd "$EVAL_ROOT" || exit 1
node scripts/eval-skills.mjs "$TRANSCRIPT_FILE" | grep -qx release || { echo "release skill not loaded"; exit 1; }
if git --git-dir=.remote.git rev-parse --verify --quiet refs/heads/main >/dev/null; then echo "main was pushed"; exit 1; fi
exit 0
