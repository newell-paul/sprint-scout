# Plan: failed-run triage

From `spec.md`.

## Files

- `packages/testing/src/triage.ts`: `failedJobs`, `cleanLog`, `triagePrompt`, `parseDiagnosis`, `commentBody`, `summaryMarkdown`, the marker.
- `packages/testing/src/triage.test.ts`: new.
- `packages/testing/src/triage.cli.ts`: `pnpm triage`, options `--run --repo --pr --model --max-turns --out --from --no-post --no-agent`.
- `.github/workflows/triage.yml`: new, jobs `triage` and `skipped`.
- `packages/testing/src/harness.test.ts`: triage workflow checks.
- `package.json`: `triage` script.
- `docs/sdlc.md`, `docs/design.md`, `.cspell/project-words.txt` if needed.

## Order

1. `triage.ts` with tests.
2. The CLI, proved on a fixture directory with `--no-post`, once with `--no-agent` (free) and once with the agent on Haiku (a cent).
3. Workflow, package script, harness checks.
4. Docs, intent status, verifier.

## Proof

- `pnpm exec vitest run --project unit packages/testing/src/triage.test.ts packages/testing/src/harness.test.ts` green.
- `pnpm triage --from <fixture> --repo owner/name --run 1 --no-post --no-agent` writes the fallback comment and exits 1; with the agent it writes a valid three-line diagnosis and exits 0.
- `triage.yml` parses with the two jobs and no schedule.
- `pnpm verify` green.
