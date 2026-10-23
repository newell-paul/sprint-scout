# Review policy

Applies to every pull request, whether reviewed by a person, by a second model run by hand, or by an automated reviewer. Findings inform the human decision; they never approve or block on their own. Branch protection on `main` requires the Checks workflow and a pull request.

## Passes

1. **Correctness against the plan.** Read `intent/<slug>/plan.md` when the PR names one. Every proof item has evidence in the diff or the suite; every file changed is in the plan or explained. Look for logic errors, unhandled states (empty, error, mobile, offline), and silent fallbacks that hide failure.
2. **Rules of this repository.** No Strava data, tokens or credentials. Calculations in `packages/analysis` and `packages/application` stay deterministic and tested. No network request before a user action or consent. UI never implements ranking maths. Architectural changes carry a dated entry in `docs/design.md`.
3. **Tests.** New behaviour has a test at the lowest level that can prove it. Baselines (`__aria__`, `__screenshots__`) changed only through the test runner. Bug fixes include the failing test.

## Severity

- **Blocker:** data leaves the browser without consent; a credential or Strava data in the diff; a calculation changes result without a test; a gate disabled or weakened.
- **Major:** a user-visible defect in a listed state; a plan proof item with no evidence; a test that passes without asserting the behaviour.
- **Minor:** naming, duplication, a missing edge-case test that does not change the verdict.
- **Nit:** style the formatter does not already enforce. At most five per review; prefer none.

## Exclusions

`pnpm-lock.yaml`, `e2e/__aria__/**`, `**/__screenshots__/**`, `apps/web/public/maplibre/**`, generated `next-env.d.ts`, and dated history entries in `docs/design.md` and `docs/validation.md`.

## Output

Findings grouped by severity, each with file, line, the defect in one sentence and the concrete input or state that triggers it. End with the tally. Repeated findings across reviews become a line in `AGENTS.md` under "Known mistakes".

Every comment uses the same Markdown, so the notification emails read alike. Each inline comment:

```markdown
**Minor** · <the defect, under ten words>

**Trigger:** <the concrete input or state>

**Fix:** <the smallest change that closes it>
```

The summary comment:

```markdown
### Review

**Major**

- `path/to/file.ts:42` <defect>. **Trigger:** <input or state>.

**Minor**

- ...

Tally: 0 blocker, 1 major, 1 minor, 0 nit
```

Only severities with findings get a heading. With no findings, the summary is the `### Review` heading, two sentences and the tally line.

## Automation

The `Review` workflow applies this policy with `claude-code-action` to every non-draft pull request from this repository when the repository variable `REVIEW_ENABLED` is `true`: inline comments for Blocker, Major and Minor findings, one summary comment with the tally, and a `review-report` artifact that the dashboard reads. It never approves or requests changes. A comment containing `@claude` on a pull request starts the fix loop, which changes only what the comment asks, runs the relevant check and pushes to that pull request's branch only.
