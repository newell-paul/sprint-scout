# Spec: spec drafts and band issues

From [intent.md](intent.md).

## Behaviour

### Spec drafts

- `spec.yml` runs on a push to `main` that touches `intent/*/intent.md`.
- A deterministic step picks the candidates: folders whose `intent.md` changed in the push, has the line `Status: accepted`, and has no `spec.md` on `main`. It skips a folder when an open pull request already has the branch `spec/<slug>`, and says so in the job summary. To get a fresh draft, the owner closes that pull request and touches the intent again.
- One candidate per run: the first in path order. Others get a summary line saying they wait for the next push. In practice one intent is accepted at a time.
- `claude-code-action` drafts the spec. It may read anything (`Read`, `Glob`, `Grep`), write only `intent/<slug>/spec.md`, and run one command: `pnpm spec:draft open`. The slug must be lower-case letters, digits and hyphens, because it lands in that write permission. Checkouts keep no GitHub token on disk for the model to read. It is told to follow the `intent` skill's spec template and `AGENTS.md`, to answer each open question from the intent or the repository, and to list the rest under `## Unresolved questions` instead of guessing.
- `pnpm spec:draft open` is deterministic. It reads the slug from the job environment, never from its arguments, and validates `intent/<slug>/spec.md`: a `# Spec:` title, a link back to `intent.md`, and the five sections Behaviour, Data and privacy, Calculations, Tests and Docs. If anything is missing it prints the errors and exits 1, so the model can correct the file and run it again. If the file is valid it commits only that file on `spec/<slug>`, pushes, and opens the pull request. The pull request is a draft when the spec has unresolved questions, and its body lists them first.
- The script runs inside the action because the action revokes its GitHub App installation token when it ends. That token is what lets Checks run on the pull request; a pull request opened with the job token would not trigger them.
- If the action ends with no pull request open for `spec/<slug>`, a later step fails the job with the action's conclusion in the summary.

### Band issues

- A new `band-issue` job in `ci.yml` runs after the dashboard job on `main` when that job reports a 3σ breach. The dashboard job exposes this as an output; it still fails as today.
- A deterministic step reads `bands.json` and `history.json` from the `dashboard` artifact. For each breached band it records the value, mean, σ and z. It also finds the last run in history where every breached band was inside 2σ, and lists `git log` from that run's commit to the current one.
- `claude -p` with read-only tools drafts one `intent.md` covering every breached band in the run: the problem with the numbers, the commits most likely responsible, and open questions. It follows the template in the `intent` skill (`.claude/skills/intent/SKILL.md`) and answers with the Markdown only. The issue title is deterministic: `Band breach: <labels>`.
- A deterministic step validates the intent's headings and posts it as an issue labelled `band-breach`. The issue body holds the breach table, the commit range, the drafted intent in a fenced block, and a hidden marker per band, `<!-- band:<id> -->`. If an open `band-breach` issue already carries a marker for any breached band, that issue is updated rather than a new one opened.
- A malformed answer posts the deterministic part (table and commit range) with a note that the draft failed, and the job fails.

### Both

- Behind `SPEC_ENABLED` (off), with off-jobs that write a one-line summary when the switch is off, like review and triage.
- Model: `SPEC_MODEL`, default `claude-sonnet-5-5`.

## Data and privacy

Nothing leaves GitHub except the prompt to the model: merged intents, repository files, dashboard numbers and commit messages from `main`. No pull request or fork code is checked out or run. Secrets: `CLAUDE_CODE_OAUTH_TOKEN` only. The app-specific network rules (Open-Meteo, OpenStreetMap, consent) are untouched.

## Calculations

None new. The breach numbers come from `bands.ts` as they are. The "last in-band run" search is deterministic and tested.

## Tests

- `packages/testing/src/spec-draft.test.ts`: candidate selection (accepted, not accepted, spec already present, open pull request, several candidates), the prompt names the slug, the intent and the template, draft validation (each missing part rejected, valid draft accepted), unresolved questions read from the spec, and the pull request body with and without them.
- `packages/testing/src/band-issue.test.ts`: breached bands from `bands.json`, the last in-band run (found, none in history), the issue body and markers, matching an existing issue by marker, intent validation, the fallback body.
- `harness.test.ts`: `spec.yml` is triggered only by pushes to `main` on `intent/*/intent.md` and has no schedule; both paid jobs are gated on `SPEC_ENABLED`; neither checks out a pull request ref; the band issue model has read-only tools; the spec model's only command is `pnpm spec:draft open`.
- Each new test is shown to fail by breaking the code it guards, per the 11 October lesson.

## Docs

- `docs/sdlc.md`: step 13 marked done, and the Design row "Spec drafted automatically" and the Maintain row "Headless triggers that write intent.md" updated.
- `docs/design.md`: entry "Spec drafts and band issues".
