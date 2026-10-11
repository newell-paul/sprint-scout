import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { nextFreeSlot, readLibrary, type DrawnRoute } from "./library";

const runs = { numRuns: 200, seed: Number(process.env.FC_SEED ?? 20260913) };
const messages = new Set([
  "Saved library is too large.",
  "Saved library is invalid; existing data has been preserved.",
  "Duplicate route IDs.",
  "Duplicate segment slots.",
]);
const point = fc.tuple(
  fc.double({ min: -180, max: 180, noNaN: true }),
  fc.double({ min: -85, max: 85, noNaN: true }),
);
const points = fc
  .tuple(point, point, fc.array(point, { maxLength: 6 }))
  .filter(([a, b]) => a[0] !== b[0] || a[1] !== b[1])
  .map(([a, b, rest]) => [a, b, ...rest]);
const name = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((value) => value.trim().length > 0);
const optional = <T>(value: fc.Arbitrary<T>) =>
  fc.option(value, { nil: undefined });
const route = fc.record(
  {
    id: fc.string({ minLength: 1, maxLength: 80 }),
    name,
    points,
    confirmed: fc.constant(true as const),
    createdAt: fc.constant("2026-09-10T08:00:00Z"),
    targetTimeS: optional(
      fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 86400 })),
    ),
    terrain: optional(fc.constant(null)),
    terrainMode: optional(fc.constantFrom("flat" as const, "terrain" as const)),
    terrainAuto: optional(fc.boolean()),
    shelter: optional(
      fc.constantFrom(
        "exposed" as const,
        "sheltered" as const,
        "dense" as const,
      ),
    ),
  },
  { noNullPrototype: true },
);
const library = fc
  .uniqueArray(route, { maxLength: 8, selector: (r) => r.id })
  .chain((routes) =>
    fc
      .array(fc.boolean(), {
        minLength: routes.length,
        maxLength: routes.length,
      })
      .map((keepSlot) =>
        routes.map((r, index) =>
          keepSlot[index] ? { ...r, slot: index * 3 } : r,
        ),
      ),
  );
const strip = (value: unknown) => JSON.parse(JSON.stringify(value)) as unknown;

describe("saved library invariants", () => {
  it("only ever fails with a documented message on arbitrary JSON", () => {
    fc.assert(
      fc.property(fc.json(), (raw) => {
        try {
          const routes = readLibrary(raw);
          return (
            Array.isArray(routes) &&
            new Set(routes.map((r) => r.slot)).size === routes.length
          );
        } catch (error) {
          return error instanceof Error && messages.has(error.message);
        }
      }),
      runs,
    );
  });
  it("reads a valid library idempotently", () => {
    fc.assert(
      fc.property(library, (routes) => {
        const once = readLibrary(JSON.stringify(routes));
        const twice = readLibrary(JSON.stringify(once));
        expect(strip(twice)).toEqual(strip(once));
        expect(new Set(once.map((r) => r.slot)).size).toBe(once.length);
        expect(once.map((r) => r.id)).toEqual(routes.map((r) => r.id));
      }),
      runs,
    );
  });
  it("assigns the lowest free slot", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.nat({ max: 40 }), { maxLength: 30 }),
        (slots) => {
          const taken = new Set(slots);
          const free = nextFreeSlot(
            slots.map((slot) => ({ slot })) as DrawnRoute[],
          );
          return (
            !taken.has(free) &&
            Array.from({ length: free }, (_, i) => i).every((i) => taken.has(i))
          );
        },
      ),
      runs,
    );
  });
});
