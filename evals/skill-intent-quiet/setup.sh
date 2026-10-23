#!/bin/bash
# Plants a one-word typo for a fix too small for an intent.
set -e
cd "$EVAL_ROOT"
node -e 'const f="docs/test-strategy.md",fs=require("fs");fs.writeFileSync(f,fs.readFileSync(f,"utf8").replace("deterministic","determinstic"))'
grep -q determinstic docs/test-strategy.md
