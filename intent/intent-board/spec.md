# Spec: Intent board on the dashboard

From [intent.md](intent.md).

## Behaviour

A new dashboard section, **Intent board**, follows AI practice. It shows four columns in this order: Draft, Accepted, In build, Done.

- **Sources.**
  - Every `intent/*/intent.md` on the commit the dashboard is built from (`main`).
  - Every intent folder touched by an open pull request from a branch of this repository, read from that branch. Pull requests from forks are skipped, since their branches are not in this repository.
  - When a slug is on both, the branch copy wins and the card carries the pull request. When several open pull requests touch the same slug, the highest number wins.
- **Column.** The `Status:` line, lower-cased and trimmed:

  | Status                      | Not on an open pull request | On an open pull request           |
  | --------------------------- | --------------------------- | --------------------------------- |
  | `draft`, missing or unknown | Draft                       | Draft, or In build with a plan    |
  | `accepted`                  | Accepted                    | Accepted, or In build with a plan |
  | `in build`                  | In build                    | In build                          |
  | `done`                      | Done                        | In build until merged             |
  | `dropped`                   | Dropped                     | Dropped                           |

  An intent marked `done` on its branch stays In build until the pull request merges, because each intent lands with its code.

- **Card.**
  - The title is the first level-one heading, or the slug when there is none.
  - The opened date comes from the `Opened:` line, without the "by" part.
  - Two markers say whether `spec.md` and `plan.md` exist next to the intent.
  - With a pull request: a link `#N` to it, "draft" when it is a draft, and its check state: passing, failing, running or no checks.
  - The slug links to the folder on GitHub: `tree/main/intent/<slug>` from `main`, `tree/<branch>/intent/<slug>` from a pull request branch.
- **Order.** Within a column, newest opened date first, then slug by code-unit comparison. A card without a parseable date sorts last.
- **Check state.** From the pull request's status check rollup:
  - failing when any check run concludes failure, cancelled, timed out, action required or startup failure, or any status is failure or error;
  - otherwise running when any check run is not completed or any status is pending or expected;
  - otherwise passing when there is at least one check;
  - otherwise no checks.
- **Dropped.** Folded under the board in a `<details>` element, summary "Dropped (N)", absent when there are none.
- **Long columns.** A column shows its newest six cards; the rest fold under a `<details>` element, summary "Show N more" (added 24 October 2026).
- **Empty states.** An empty column says "None". With no intents at all, the section says "No intents".
- **Freshness.** The section lead says the board reflects open pull requests when the dashboard was built. It refreshes only with the dashboard, on a push to `main` (intent question 1).
- **Draft pull requests.** An intent appears once any pull request is open, draft or not. A branch without a pull request is not read (intent question 2).
- **Layout.** Static HTML, no scripts, the dashboard's tokens in light and dark. The columns sit side by side on wide screens and stack on narrow ones.
- The plain intents table in AI practice is removed; the board replaces it. The Intents card, which counts statuses on `main`, stays.

## Data and privacy

Nothing changes for the planner or its users. The dashboard job reads pull request metadata and intent files from this public repository with its existing `github.token`. The job gains `checks: read` and `statuses: read` so the token can see each pull request's check rollup; both are read-only. No new secret or schedule. Pull request text is escaped like every other value on the page. The band-issue job, whose model reads the dashboard artifact and whose inputs must come from `main` only, strips the board from `history.json` and deletes every other artifact file except `bands.json` before the model runs.

## Calculations

No maths. The board is a pure function of the intent files and the collected pull request data, with a stable sort. Dates are parsed from the "24 October 2026" form with a fixed month list, not `Date.parse`.

History: the snapshot gains a `board` field. Only the newest history entry keeps it, so the 90-entry history does not grow by a board per run.

## Collection

`scripts/collect-intents.mjs`, run in the dashboard job after the delivery data, writes `reports/github/open-intents.json`:

- `gh pr list --state open` with number, URL, draft flag, head branch, cross-repository flag, changed files and check rollup;
- for each intent slug among a pull request's changed files, the folder listing and `intent.md` from that branch through the contents API;
- each entry: slug, intent text, `spec` and `plan` presence, and the pull request fields.

Like `collect-reviews.mjs`, every failure degrades to less data: with no access it writes `[]`, and the job step never fails the dashboard.

The CLI gains `--open-intents reports/github/open-intents.json` and `--repo owner/name` (default `GITHUB_REPOSITORY`) for the folder links. `readIntents` adds spec and plan presence for intents on `main`.

## Tests

Unit, in `packages/testing/src/dashboard.test.ts`:

- check state: failing beats running beats passing; empty is no checks; status contexts and check runs both count;
- columns for every row of the status table, including `done` on an open branch;
- a branch copy replaces the `main` copy and carries its pull request; the highest pull request number wins a tie;
- title from the heading, slug fallback; opened date without "by";
- sort by date then slug, undated last;
- render: four columns in order, "None" for an empty column, Dropped folded and absent when empty, pull request link and check text, folder links for `main` and branch, escaped titles, "No intents";
- history: only the newest entry keeps `board`;
- the old intents table is gone.

No component, e2e or ARIA snapshot changes: the dashboard is not part of the planner.

## Docs

- `docs/design.md`: dated entry "Intent board on the dashboard — 24 October 2026", covering the sources, the column rule, the `done`-on-branch rule and the refresh lag.
- `docs/sdlc.md`: the AI practice line in "The dashboard" mentions the board.
