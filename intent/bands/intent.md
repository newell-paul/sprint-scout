# Deterministic bands over the dashboard history

Status: done
Opened: 10 October 2026 by the owner

## Problem

The dashboard shows trends but nothing reacts to them. A slow drift in suite duration, a drop in coverage or a shrinking bundle budget is noticed only if someone reads the page after every push.

## Proposed outcome

A small, deterministic rule set compares each run on `main` with the previous runs and escalates by distance from the baseline: logged at 1σ, annotated on the dashboard at 2σ, failing the dashboard job at 3σ so the run is red and Pages does not publish it. Later, a breach opens an issue with a drafted intent (step 13, paid).

## Affected users and parts

The owner. `packages/testing/bands.yaml`, `packages/testing/src/bands.ts`, the dashboard CLI and render, the dashboard job in the Checks workflow, `docs/sdlc.md`.

## Constraints

Free and deterministic: sample statistics over the recorded history, no model, no network. A flat baseline must not alarm on noise, so each band carries a minimum sigma. The dashboard and history are uploaded before the job fails.

## Open questions

1. Where does the config live? Resolved: `packages/testing/bands.yaml`, beside the code that reads it.
2. What happens on the first runs? Resolved: a band is inert until it has five previous values.
