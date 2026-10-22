# Spec drafts and band issues

Status: in build
Opened: 22 October 2026 by Paul Newell

## Problem

Two handovers in the SDLC still wait on a person (`docs/sdlc.md`, step 13).

- An accepted `intent.md` sits on `main` until someone opens a session to write its `spec.md`. The spec follows a fixed template from facts already in the intent and the repository, so the first draft is mechanical.
- When a dashboard metric leaves its 3σ band, the dashboard job on `main` fails and the breach shows in the job summary and on the page. Nothing turns it into work: no issue, no drafted intent, and the band only says what moved, not which change moved it.

## Proposed outcome

- **Spec drafts.** When a push to `main` adds or changes an `intent/*/intent.md` with status `accepted` and that folder has no `spec.md`, a draft `spec.md` arrives as a pull request within minutes. It follows the template in the `intent` skill and resolves each open question from the intent or lists it as unresolved. Checks run on it like any other pull request, and the owner edits, merges or closes it.
- **Band issues.** When the dashboard job on `main` finds a 3σ breach, an issue opens with the band, the values, the commits since the last run inside the band, and a drafted `intent.md` in the issue body. A later breach of the same band updates that issue instead of opening another. The owner accepts it by committing the intent, or closes it.
- Both are paid, event-triggered, never scheduled, and behind one switch, `SPEC_ENABLED`, which starts off.

## Affected users and parts

The owner. New `spec.yml` workflow; a breach job in `ci.yml` after the dashboard job; prompt and validation code in `packages/testing/src/` with tests; the harness test; `docs/sdlc.md` (step 13 and the Design and Maintain rows), `docs/design.md`.

## Constraints

- No schedules. Paid steps run only on a push to `main` or a 3σ breach, behind `SPEC_ENABLED`, on `CLAUDE_CODE_OAUTH_TOKEN`.
- Inputs come from `main` only: merged intents, the repository, dashboard history and commit messages. No pull request or fork code is checked out or run.
- Writes are a pull request or an issue, never a push to `main`. A pull request opened with the job token does not trigger Checks, so the spec pull request needs a token that does.
- Drafts never resolve an open question by guessing: an answer is either in the intent or the repository, or it is listed as unresolved for the owner.
- A model answer in the wrong shape posts nothing silently: a deterministic fallback names what happened and the job fails, as triage does.

## Open questions

1. Which token opens the spec pull request so Checks run on it: the Claude GitHub App token through `claude-code-action`, or another route?
2. What happens when an accepted intent changes again after its spec draft exists, or a spec pull request is already open for it?
3. How does a band issue find the change that caused the breach: commit range from the last in-band run, the dashboard history only, or both?
4. Which model drafts, and can a repository variable override it, as with review and triage?
