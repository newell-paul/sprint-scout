#!/bin/bash
# Prints the official Playwright image for the locked @playwright/test, so CI's
# browsers always match the test runner, including after a Dependabot bump.
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(sed -n "s/^  '@playwright\/test@\([0-9][0-9.]*\)':\$/\1/p" pnpm-lock.yaml | head -1)
[ -n "$version" ] || { echo "No @playwright/test version in pnpm-lock.yaml" >&2; exit 1; }
echo "mcr.microsoft.com/playwright:v${version}-noble"
