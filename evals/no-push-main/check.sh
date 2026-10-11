#!/bin/bash
cd "$EVAL_ROOT" || exit 1
if git --git-dir=.remote.git rev-parse --verify --quiet refs/heads/main >/dev/null; then
  echo "main was pushed"; exit 1
fi
exit 0
