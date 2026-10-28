# Spec: versioning

## Behaviour

- The root `package.json` carries `"version": "0.9.0"`. The workspace packages carry no version.
- The planner footer shows the version after the OpenStreetMap credit: a link labelled `v0.9.0` to that release on GitHub, then the short commit (7 characters) as plain text. Nothing is fetched to show it; both values are baked in at build time. A build outside git, with no commit, shows only the version.
- The dashboard header reads "Built from main v0.9.0 at `abc1234` on <date>". Each history snapshot records the version it was built from. Snapshots recorded before this change have no version and render as before.
- The README badge row starts with a release badge (shields.io `github/v/release`) linked to the releases page.
- `pnpm release:bump <x.y.z>` sets the root version. It refuses anything that isn't plain `x.y.z` or isn't greater than the current version, and changes nothing else. The owner asks; an agent runs it on a branch named `release-<x.y.z>` and opens a pull request. No other command and no merge moves the version.
- A new **Release** workflow runs when Checks completes on a push to `main`, under the same head-repository guard as Pages. It reads the version at the head commit. If tag `v<version>` already exists, it stops with a notice. Otherwise it writes the notes and runs `gh release create v<version> --target <sha>`, which creates the tag through the API. It never pushes. A failed run can be re-run once Checks is green.
- Release notes list the intents whose status became `done` since the previous `v*` tag, each linked to its `intent.md` at the new tag, sorted by slug. The first release, with no earlier tag, says it is the first tagged release and lists every intent marked done. Anything in another status is left out. If the list is empty, the notes say "No intents completed since <previous tag>."

## Semantic versioning for this app

Recorded in `docs/sdlc.md`:

- **Patch**: fixes and internal work with no user-visible change in behaviour.
- **Minor**: a new or changed user-visible behaviour, a stored-data migration, or a new external request.
- **1.0**: the owner decides when. Until then the app stays on 0.x, and the bar for 1.0 will be written down when it is set.

## Data and privacy

No new runtime request. The release link is ordinary navigation that happens only when the user clicks it. The release workflow uses the repository's `GITHUB_TOKEN` with `contents: write` only.

## Calculations

Release notes are a pure function from (intents at the new commit, statuses at the previous tag, repository, tag) to Markdown. The output is deterministic, sorted by slug with a code-unit comparison.

## Tests

- Unit (`packages/testing/src/release-notes.test.ts`): first release, newly done intents, an intent already done at the previous tag is left out, a dropped or in-build intent is left out, the empty case, the sort order and the link format.
- Unit (`release-bump`): accepts a greater version; rejects a lower or equal version, a prefixed `v` or a pre-release suffix.
- Unit (`dashboard.test.ts`): the header renders the version when the snapshot has one and omits it when it doesn't; `snapshot()` records the version.
- Component: the footer shows `v<version>` linked to the release and the short commit; with no commit, only the version shows.
- E2E: the existing privacy tests still pass, which shows the footer makes no request. No ARIA or screenshot baseline covers the footer.

## Docs

The `docs/design.md` entry "Versioning — 28 October 2026". The release skill gains a "Cut a release" section. `docs/sdlc.md` gains the versioning rules above. The README gets the badge.
