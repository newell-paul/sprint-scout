# Versioning

Status: accepted
Opened: 28 October 2026 by Paul Newell

## Problem

SprintScout has no version. `package.json` has no `version` field, the repository has no tags and no GitHub releases, and the live site and dashboard don't say which build they are. A reader of the repository can't tell how mature the app is or what changed between deploys, and a bug report can't name the build it came from.

## Proposed outcome

- The project is at 0.9.0: in `package.json`, as a `v0.9.0` tag on `main` and as a GitHub release with notes.
- The version shows on GitHub (the release, and a badge in the README) and in the app and dashboard, so a deploy names its version.
- Bumping the version is one deliberate step that an agent can do when the owner asks, through a pull request like any other change.
- It is written down what moves the version (patch, minor, and what 1.0 means for this app).

## Affected users and parts

The owner, readers of the repository and anyone reporting a bug. Root `package.json`, the README, the app footer, the dashboard header, `.github/workflows/` (release step), the `release` skill, `docs/sdlc.md`, `docs/design.md`.

## Constraints

No schedules. Agents still never push to `main` or force-push; a tag or release comes from a workflow, not a direct push. Static hosting, no new runtime request. Lighthouse and size budgets hold.

## Open questions

Resolved by the owner on 28 October 2026:

1. Who creates the tag and release? A workflow, when a merged version bump reaches `main` and Checks pass on it.
2. Do the workspace packages carry their own versions? No, only the root. The packages are private and never published.
3. Where do release notes come from? The intents marked done since the last tag.
4. Does every deploy bump the patch version? No, only an owner-cut release moves the version.
5. Where does the version show in the app? The footer and the dashboard header, with the short commit.
6. What has to be true for 1.0? Decided later by the owner; until then the app stays on 0.x.
