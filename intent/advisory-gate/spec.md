# Spec: Advisory gate that blocks only what a pull request changes

From [intent.md](intent.md).

## Behaviour

The `OSV scan` job keeps its name, so the ruleset's required check is unchanged.

| Event                                    | Scans                           | Fails when                                                   | Reports                                            |
| ---------------------------------------- | ------------------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| Pull request, `pnpm-lock.yaml` unchanged | none                            | never                                                        | "Lockfile unchanged" in the job summary            |
| Pull request, `pnpm-lock.yaml` changed   | base lockfile and head lockfile | the head has an advisory, for a package, that the base lacks | new advisories, then those already on base         |
| Push to `main`                           | head lockfile                   | never                                                        | every advisory in the summary and in code scanning |

- The base is the first parent of the pull request's merge commit, which is the target branch tip the checks run against.
- Both scans use the head's `osv-scanner.toml`, so an ignore the pull request adds or removes applies to both sides alike.
- A scanner error (exit code other than 0 or 1) or unreadable output fails the job, whatever the event.
- `pnpm audit:prod` in the static job is unchanged and still fails any pull request with a high or critical advisory in a shipped dependency.

Dependabot security updates for npm arrive grouped: a `security` group with `applies-to: security-updates` and pattern `*` joins `.github/dependabot.yml`. Version updates keep their existing groups.

### Summary format

```markdown
### OSV scan

**New in this pull request** (fails the check)

| Advisory | Package | Version | Severity |
| -------- | ------- | ------- | -------- |

**Already on the base branch** (reported only)

| Advisory | Package | Version | Severity |
```

A section with no rows says "None." On `main` there is one section, **On this branch**. Advisory is the group's first id; Severity is the group's `max_severity` or a dash.

## Data and privacy

Nothing new leaves the runner. The lockfiles go to the same OSV scanner image as today; SARIF goes to the repository's own code scanning. No secrets.

## Calculations

`scripts/osv-diff.mjs <head.json> [base.json]` reads osv-scanner JSON output (`results[].packages[].groups[]`).

- A finding is one group for one package: package name, version, ids, aliases, max severity.
- A head finding is **new** when no base finding for the same package name shares any of its ids or aliases. A version change of an already vulnerable package under the same advisory is not new.
- Rows are de-duplicated by advisory, package and version, and sorted by package, version, advisory with code-unit comparison.
- Exit 1 when any finding is new; 0 otherwise, and always 0 without a base file.
- A missing or malformed file throws, so the step fails.

## Tests

`packages/testing/src/osv-diff.test.ts` runs the script as a child process on fixtures written to a temporary folder:

- a head with an advisory the base lacks exits 1 and lists it under the new section;
- an advisory on both sides, including under a different version or matched only through an alias, exits 0 and lists it under base;
- the same advisory on a different package counts as new;
- no base file exits 0 with one **On this branch** section;
- empty results print "None.";
- rows come out sorted and de-duplicated;
- a missing head file exits non-zero.

No app, component or e2e test changes. No ARIA snapshot changes.

## Docs

- `docs/test-strategy.md`: the non-functional row and the CI list say what each advisory gate blocks.
- `docs/sdlc.md`: a Progress entry.
- `docs/design.md`: dated entry "Advisory gate on what a pull request changes — 24 October 2026".
