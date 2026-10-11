# Evals for the agent configuration

Status: done
Opened: 10 October 2026 by the owner

## Problem

The repository now carries an instruction file, hooks, skills and agents, but nothing proves they steer an agent. A change to any of them can silently weaken a guardrail. The repository is also a showcase of AI-native practice, so the proof should be visible and cheap enough to keep running.

## Proposed outcome

A small eval suite exists in the repo, runs free checks on every relevant pull request, runs paid checks only when switched on or dispatched, records cost per run, and shows its latest score on the dashboard and a badge.

## Affected users and parts

The owner and anyone reading the repo. New `evals/` folder, `scripts/run-evals.mjs`, a harness test in `packages/testing`, the `Evals` workflow, `AGENTS.md` commands, `docs/sdlc.md`.

## Constraints

No scheduled workflows. Cost very low: five short tasks, a small model by default, a switch to disable the paid job, results cached by configuration hash. Deterministic checks only. Nothing committed until the owner says.

## Open questions

1. How many tasks? Resolved: five to start, one per lesson afterwards.
2. Which model? Resolved: Haiku by default, any model on dispatch for demos.
3. Where do results show? Resolved: job summary and artifact now, dashboard and badge in the dashboard step.
