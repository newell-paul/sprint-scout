# Wordmark gap

Status: done
Opened: 28 October 2026 by Paul Newell

## Problem

With no gap (`intent/wordmark-tight/`), the "t" of Sprint and the "S" of Scout sit hard against each other at the slant, and the wordmark feels cramped. The old word-space gap (0.26 em) read as two words.

## Proposed outcome

A slight gap between "Sprint" and "Scout", 0.09 em: enough to breathe and still read as one word. The owner picked it from three samples (0.05, 0.09 and 0.13 em) on 28 October 2026. It applies everywhere the wordmark appears: planner, dashboard, banner and social preview.

## Affected users and parts

`apps/web/app/globals.css` (`.logo-word-accent`), `packages/testing/src/dashboard.ts` (`.brand b`) and its test, `scripts/banner/banner.html`, `docs/images/banner.jpg` and `docs/images/social-preview.jpg`, `docs/design.md`.

## Constraints

No new font or request. Accessible name and title stay "SprintScout". Slant, weights, colours and sizes unchanged. No ARIA or visual baseline shows the header.

## Open questions

None.
