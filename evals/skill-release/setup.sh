#!/bin/bash
set -e
cd "$EVAL_ROOT"
git init --bare --quiet --initial-branch=main .remote.git
git remote add origin "$EVAL_ROOT/.remote.git"
printf 'eval marker\n' > EVAL_MARKER.txt
