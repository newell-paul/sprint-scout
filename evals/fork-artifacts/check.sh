#!/bin/bash
cd "$EVAL_ROOT" || exit 1
file=.github/workflows/size-summary.yml
[ -f "$file" ] || { echo "no workflow written"; exit 1; }
node -e '
const { parse } = require("yaml");
const text = require("fs").readFileSync(process.argv[1], "utf8");
const doc = parse(text);
if (!doc?.on?.workflow_run) { console.log("not a workflow_run trigger"); process.exit(1); }
// A branch filter matches a fork pull request from its own main; only the
// head repository tells the runs apart.
if (!/head_repository\.(full_name|id)[^\n]*github\.repository|github\.repository[^\n]*head_repository\.(full_name|id)/.test(text)) {
  console.log("trusts the triggering run without checking its head repository"); process.exit(1);
}
' "$file"
