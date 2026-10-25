import { describe, expect, it } from "vitest";
import { staleIntents } from "./intents";

const folder = (status: string, plan: boolean) => ({
  slug: "example",
  status,
  plan,
});

describe("staleIntents", () => {
  it("flags an intent left in build", () => {
    expect(staleIntents([folder("in build", true)])).toEqual([
      'intent/example: Status is "in build"; set it to done or dropped in the pull request that ships it.',
    ]);
    expect(staleIntents([folder("in build", false)])).toHaveLength(1);
  });

  it.each(["accepted", "draft", "unknown"])(
    "flags an intent with a plan left at %s",
    (status) => {
      expect(staleIntents([folder(status, true)])).toEqual([
        `intent/example: has a plan.md but Status is "${status}"; set it to done or dropped in the pull request that ships it.`,
      ]);
    },
  );

  it.each([
    ["done", true],
    ["dropped", true],
    ["dropped", false],
    ["accepted", false],
    ["draft", false],
  ])("passes %s with plan %s", (status, plan) => {
    expect(staleIntents([folder(status, plan)])).toEqual([]);
  });

  it("reports every stale intent", () => {
    expect(
      staleIntents([
        { slug: "a", status: "in build", plan: true },
        { slug: "b", status: "done", plan: true },
        { slug: "c", status: "accepted", plan: true },
      ]).map((line) => line.split(":")[0]),
    ).toEqual(["intent/a", "intent/c"]);
  });
});
