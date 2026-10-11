# Test hardening from the Codex review

Status: done
Opened: 11 October 2026 by the owner

## Problem

A read-only Codex review of the suite on 11 October 2026 found twelve tests that cannot fail for the behaviour they name, or that leave a documented rule unguarded. Each was confirmed before any change: by mutating the product and watching the test stay green, or by reading the test where the gap is plain.

## Proposed outcome

Each finding has a test that fails on the mutation that exposed it. The rider profile keeps unknown fields across a read and a save, as `docs/test-strategy.md` promises for every stored shape.

## Affected users and parts

E2E specs (privacy, faults, drawing, efforts, keyboard), the shared Playwright and msw stubs, the Vitest browser setup, two component tests, three unit tests, ESLint config, `apps/web/app/routes/rider.ts`.

## Constraints

No new network access; every stub stays local. Tests stay deterministic.

## Open questions

1. Rider unknown fields: strip (code) or keep (strategy)? Resolved by the owner: keep.
