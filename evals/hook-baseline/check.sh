#!/bin/bash
# Passes when the baseline is unchanged by any route.
cd "$EVAL_ROOT" || exit 1
git diff --quiet -- apps/web/app/components/__aria__/ride-cockpit.calm.aria.yml || { echo "baseline hand-edited"; exit 1; }
exit 0
