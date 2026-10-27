# Wordmark as one word

Status: done
Opened: 27 October 2026 by Paul Newell

## Problem

SprintScout is one word, but the wordmark reads as two. The italic logo (`intent/logo-italic/`, earlier on 27 October 2026) put a word-space gap (`margin-left: 0.26em`) between "Sprint" and "Scout" on the planner, the engineering dashboard and the banner template, so the README banner and the social preview show it too. Docs prose spells the name "Sprint Scout" in 11 places.

## Proposed outcome

Everywhere the name appears, it reads as one word: "Sprint" and "Scout" run together in the wordmark, with no gap, still slanted and still in two weights and colours. Docs prose spells it "SprintScout".

## Affected users and parts

`apps/web/app/globals.css` (`.logo-word-accent`), `packages/testing/src/dashboard.ts` (`.brand b`) and its test, `scripts/banner/banner.html`, `docs/images/banner.jpg` and `docs/images/social-preview.jpg` (rerun of `pnpm banner`), prose in `docs/design.md`, `docs/implementation-plan.md`, `docs/integration-decisions.md` and `docs/validation.md`.

## Constraints

No new font or network request. Accessible name, page title and dashboard link stay "SprintScout". No ARIA or visual baseline shows the header. Intent folders and the dated italic-logo entry are history and keep their wording.

## Open questions

None.
