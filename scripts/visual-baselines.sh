#!/usr/bin/env bash
# Regenerates e2e/__screenshots__ inside the official Playwright container so
# baselines are Linux renders, the same as CI. Needs Docker.
set -euo pipefail
cd "$(dirname "$0")/.."
image="mcr.microsoft.com/playwright:v$(node -p "require('@playwright/test/package.json').version")-noble"
work="$(mktemp -d)/sprint-scout"
mkdir -p "$work"
rsync -a --exclude node_modules --exclude .next --exclude test-results \
  --exclude playwright-report --exclude blob-report --exclude coverage \
  --exclude reports --exclude .stryker-tmp ./ "$work/"
# The tree is copied into the container's own filesystem: pnpm's parallel
# symlinking is unreliable on a bind mount, and Linux node_modules must not
# land in the host checkout.
docker run --rm -v "$work:/src" -e CI=1 -e VISUAL=1 \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 "$image" bash -lc '
  set -euo pipefail
  mkdir -p /work && cp -a /src/. /work/ && cd /work
  corepack enable && corepack prepare pnpm@10.30.3 --activate
  pnpm install --frozen-lockfile
  pnpm exec playwright test --grep @visual --update-snapshots --workers 2
  rm -rf /src/e2e/__screenshots__ && cp -R e2e/__screenshots__ /src/e2e/'
rm -rf e2e/__screenshots__
cp -R "$work/e2e/__screenshots__" e2e/__screenshots__
rm -rf "$(dirname "$work")"
echo "Baselines written to e2e/__screenshots__"
