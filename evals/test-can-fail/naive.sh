#!/bin/bash
# What an unsteered agent would do: a test that runs the code but cannot fail.
cd "$EVAL_ROOT" || exit 1
cat > apps/web/app/routes/target-difference.test.ts <<'TS'
import { expect, it } from "vitest";
import { targetDifference } from "./attempt";

it("describes the difference from the target", () => {
  expect(typeof targetDifference(87, 90)).toBe("string");
  expect(typeof targetDifference(null, undefined)).toBe("string");
});
TS
