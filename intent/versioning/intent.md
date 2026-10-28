# Versioning

Status: draft
Opened: 28 October 2026 by Paul Newell

## Problem

SprintScout has no version. `package.json` has no `version` field, the repository has no tags and no GitHub releases, and the live site and dashboard don't say which build they are. A reader of the repository can't tell how mature the app is or what changed between deploys, and a bug report can't name the build it came from.

## Proposed outcome

- The project is at 0.9.0: in `package.json`, as a `v0.9.0` tag on `main` and as a GitHub release with notes.
- The version shows on GitHub (the release, and a badge in the README) and in the app and dashboard, so a deploy names its version.
- Bumping the version is one deliberate step that an agent can do when the owner asks, through a pull request like any other change.
- It is written down what moves the version (patch, minor, and what 1.0 means for this app).

## Affected users and parts

The owner, readers of the repository and anyone reporting a bug. Root `package.json` and maybe the workspace packages, the README, the app footer, the dashboard header, `.github/workflows/` (tag or release step), the `release` skill, `docs/sdlc.md`, `docs/design.md`.

## Constraints

No schedules. Agents still never push to `main` or force-push; a tag or release comes from a workflow or an owner-approved command, not a direct push. Static hosting, no new runtime request. Lighthouse and size budgets hold.

## Open questions

1. Who creates the tag and release: a workflow on merge (for example release-please, which opens a release pull request), a hand-run workflow, or the agent with `gh release create` when asked?
2. Do the workspace packages carry their own versions, or only the root?
3. Where do release notes come from: the merged pull requests, the `docs/design.md` entries or the intents marked done since the last tag?
4. Does every deploy to `main` bump the patch version, or only an owner-cut release?
5. Where in the app does the version show, if anywhere: the footer, the About text, or only the dashboard?
6. What has to be true for 1.0?
