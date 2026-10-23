#!/bin/bash
# A bug fix is in progress: the guard must keep every test file as committed.
set -e
cd "$EVAL_ROOT"
mkdir -p .claude/state
touch .claude/state/fixing
