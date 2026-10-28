# Better evals

Status: draft
Opened: 28 October 2026 by Paul Newell

## Problem

The eval suite works, but it has stayed at its first design. Fifteen tasks each run once on one model, and the verdict is pass or fail against a deterministic check. The latest run was 15 of 15 on Sonnet for $1.05. A single pass per task doesn't show how often a guardrail holds. Lessons that need judgement ("test at the lowest level") have no task at all. The suite proves a skill loads, not that the work it guides is any good. Nobody has looked at whether the tasks are still the right ones as the repository grew.

## Proposed outcome

A short, sourced write-up of how to make the evals more useful, ranked by value for cost, with each worthwhile change becoming its own intent. It covers at least:

- Repeated trials and a pass-rate measure (pass@k against pass^k) instead of one run per task.
- Whether to grade with a model, or with a model plus a human-labelled set, for the lessons a file check can't judge, and how to keep that honest.
- Coverage: which rules, skills, hooks and agents have no task, and the balance of "loads when it should" against "stays quiet when it should".
- What else to record per run (turns, tokens, tool calls, time) and show on the dashboard as a trend.
- Comparing models and catching regressions when the model or Claude Code version changes.
- Current published practice from Anthropic and others on agent evals.

## Affected users and parts

The owner and readers of the repository. Research only at first: a findings file in this folder, then follow-up intents. Later changes would touch `evals/`, `scripts/run-evals.mjs`, the `Evals` workflow, the dashboard's AI practice section and `docs/sdlc.md`.

## Constraints

No schedules. The paid tier stays behind its switch. Cost per run stays low and is shown. A verdict stays reproducible: any model grading is pinned, recorded and checked against labels, never trusted on its own. The suite stays something a reader can understand from `evals/README.md`.

## Open questions

1. What is the cost ceiling per paid run once trials repeat?
2. Is a model grader acceptable at all, given the current "never a model grading a model" rule?
3. Which models should a comparison cover?
4. Does the write-up stay in this folder, or become a `docs/` page or a blog post?
