# Plan: Advisory gate that blocks only what a pull request changes

From [spec.md](spec.md).

## Files

- `packages/testing/src/osv-diff.test.ts`: new; the script cases from the spec.
- `scripts/osv-diff.mjs`: new; compares two osv-scanner JSON results and prints the summary.
- `.github/workflows/ci.yml`: the `OSV scan` job runs the scanner image directly, scans base and head on a pull request that changes the lockfile, runs the script into the job summary, and uploads SARIF on `main`.
- `.github/dependabot.yml`: the `security` group for npm.
- `cspell.json`: `ghsa` and `sarif` for the new script, tests and docs.
- `docs/test-strategy.md`, `docs/sdlc.md`, `docs/design.md`: as in the spec.

## Order

1. Tests first; confirm they fail with the script absent.
2. The script, until the tests pass.
3. Workflow and Dependabot changes. Run the job's `Scan` script locally with the same scanner image for the three cases: lockfile unchanged, the lockfile from `3183d13` as head, and a push to `main`. The scanner image's wrapper prints its exit code to stdout, so the job calls `osv-scanner` as the entrypoint and writes results with `--output-file`.
4. Docs; intent status `done`.

## Proof

- `pnpm exec vitest run --project unit packages/testing/src/osv-diff.test.ts`: all cases pass.
- Local run: base `3183d13`, head `main` lists nothing new and exits 0; head `3183d13`, base `main` lists the advisories `main` fixed as new and exits 1.
- In the pull request: the `OSV scan` check passes and its summary shows the lockfile unchanged or the tables.
- `pnpm verify` green, through the verifier agent.
