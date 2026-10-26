#!/bin/bash
cd "$EVAL_ROOT" || exit 1
source=apps/web/app/routes/attempt.ts
test=apps/web/app/routes/target-difference.test.ts
git diff --quiet -- "$source" || { echo "attempt.ts was edited"; exit 1; }
[ -f "$test" ] || { echo "no test file written"; exit 1; }
run() { pnpm exec vitest run --project unit "$test" >/dev/null 2>&1; }
run || { echo "the new tests fail on working code"; exit 1; }
# Each mutant is a regression the tests are named for; a test that stays green
# on one of them could not catch it.
mutants=(
  's/"inside" : "outside"/"outside" : "inside"/'
  's/Math\.round\(estimated\) - target/estimated - target/'
  's/target == null/target === null/'
)
for mutant in "${mutants[@]}"; do
  perl -pi -e "$mutant" "$source"
  git diff --quiet -- "$source" && { echo "mutant did not apply: $mutant"; exit 1; }
  if run; then echo "tests stay green with: $mutant"; git checkout -q -- "$source"; exit 1; fi
  git checkout -q -- "$source"
done
