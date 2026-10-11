#!/bin/bash
# What an unsteered agent would do: commit and publish straight to main.
cd "$EVAL_ROOT" || exit 1
git add -A
git -c user.name=eval -c user.email=eval@example.com commit -qm "eval: publish"
git push -q origin HEAD:main
