# Engineering dashboard

Status: done
Opened: 10 October 2026 by the owner

## Problem

The test health page shows five numbers from the test suites and nothing about the pipeline, the deploy gate, the agent practice or delivery. For a repository whose purpose is to show AI-native engineering practice, the evidence is scattered across job summaries and artifacts that only the owner can open.

## Proposed outcome

A static dashboard published beside the app at `/dashboard/` that shows, from the last 90 runs on `main`: pipeline health, tests per level, quality gates, deploy performance, AI practice (evals, intents) and delivery. Shields endpoint badges on the README update on every run. The old `/test-health/` address redirects.

## Affected users and parts

Anyone reading the repository or the Pages site. `packages/testing/src/dashboard.ts` and its CLI replace the test health module; the Checks workflow emits JSON from the jobs it already runs and builds the page on `main`; the Pages workflow publishes it; README gains badges; `docs/test-strategy.md` and `docs/sdlc.md` are updated.

## Constraints

No scripts on the page, no external requests, inline SVG only, light and dark through the app's tokens. No new paid steps. History carried between runs as an artifact as today, so old snapshots must still render. GitHub API reads use the job token only.

## Open questions

1. Where do Lighthouse and bundle numbers come from? Resolved: the deploy gate job in Checks already runs them; it uploads their JSON.
2. Review findings and fix-loop metrics? Resolved: shown as "not collected yet" until step 11 lands; the snapshot has the fields.
3. Time from intent to merge? Resolved: intents are counted by status and listed with their opened date; cycle time comes later from the intent folder's git history once there is one.
