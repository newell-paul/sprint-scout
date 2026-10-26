# Bring the SDLC doc back in line with the repository

Status: done
Opened: 26 October 2026 by Paul Newell

## Problem

`docs/sdlc.md` has drifted from the repository. It counts 13 required checks where the ruleset has 12, says the dashboard lists the slowest ten tests where it lists five, leaves the Claude Design play at "Later" after the Aero Stealth redesign was built from a design image and mock-ups, lists two subagents of three, and its progress log stops on 24 October. `evals/README.md` says every entry in `docs/lessons.md` adds an eval, but 18 lessons have 5 tasks: most lessons are product bugs already caught by the test they name, and the agent-behaviour lessons with a deterministic check have no task.

## Proposed outcome

The SDLC doc and test strategy describe the repository as it is. The growth rule covers lessons whose rule is about how an agent works, and those with a deterministic check have an eval: one for the fork-safe `workflow_run` rule (two lessons on 25 October 2026) and one for proving a new test can fail (11 October 2026).

## Affected users and parts

`docs/sdlc.md`, `docs/test-strategy.md`, `evals/README.md`, two new tasks under `evals/`. No app change.

## Constraints

Deterministic checks only; each new task's check must fail on its naive state in the dry run. The paid evals run on the pull request because `evals/**` changes.

## Open questions

1. Which agent-behaviour lessons get no task? Resolved in spec.md.
