import { describe, expect, it } from "vitest";
import {
  pullRequestBody,
  requiredSections,
  selectCandidates,
  specPrompt,
  specTitle,
  unresolvedQuestions,
  validateSpec,
  type IntentFile,
} from "./spec-draft";

const intent = (slug: string, status: string, hasSpec = false): IntentFile => ({
  slug,
  text: `# ${slug}\n\nStatus: ${status}\nOpened: 22 October 2026 by the owner\n`,
  hasSpec,
});
const spec = [
  "# Spec: Wind rose",
  "",
  "From [intent.md](intent.md).",
  "",
  ...requiredSections.flatMap((s) => [`## ${s}`, "", "Text.", ""]),
].join("\n");

describe("selectCandidates", () => {
  it("drafts an accepted intent without a spec", () => {
    expect(selectCandidates([intent("wind-rose", "accepted")], [])).toEqual({
      slug: "wind-rose",
      waiting: [],
      skipped: [],
    });
  });

  it("skips intents that are not accepted, with the status as the reason", () => {
    const selection = selectCandidates(
      [intent("a", "draft"), intent("b", "done")],
      [],
    );
    expect(selection.slug).toBeNull();
    expect(selection.skipped).toEqual([
      { slug: "a", reason: "status is draft" },
      { slug: "b", reason: "status is done" },
    ]);
  });

  it("skips an accepted intent that already has a spec", () => {
    const selection = selectCandidates([intent("a", "accepted", true)], []);
    expect(selection.slug).toBeNull();
    expect(selection.skipped[0]?.reason).toBe("spec.md already exists");
  });

  it("skips an accepted intent whose spec pull request is still open", () => {
    const selection = selectCandidates([intent("a", "accepted")], ["spec/a"]);
    expect(selection.slug).toBeNull();
    expect(selection.skipped[0]?.reason).toBe(
      "pull request from spec/a is open",
    );
  });

  it("drafts one intent per run in path order and lists the rest as waiting", () => {
    const selection = selectCandidates(
      [
        intent("zone", "accepted"),
        intent("Apex", "accepted"),
        intent("alpha", "Accepted"),
      ],
      [],
    );
    expect(selection.slug).toBe("Apex");
    expect(selection.waiting).toEqual(["alpha", "zone"]);
  });

  it("treats an intent without a status line as not accepted", () => {
    const selection = selectCandidates(
      [{ slug: "a", text: "# A\n", hasSpec: false }],
      [],
    );
    expect(selection.skipped).toEqual([
      { slug: "a", reason: "status is missing" },
    ]);
  });
});

describe("specPrompt", () => {
  it("names the target file and carries the template and the intent", () => {
    const prompt = specPrompt(
      "wind-rose",
      "# Wind rose\n\nShow a rose.",
      "Sections: Behaviour.",
    );
    expect(prompt).toContain("intent/wind-rose/spec.md");
    expect(prompt).toContain("Sections: Behaviour.");
    expect(prompt).toContain("Show a rose.");
    expect(prompt).toContain("pnpm spec:draft open");
    expect(prompt).toContain("## Unresolved questions");
  });
});

describe("validateSpec", () => {
  it("accepts a spec with its title, link and five sections", () => {
    expect(validateSpec(spec)).toEqual([]);
  });

  it("rejects a spec without its title", () => {
    expect(
      validateSpec(spec.replace("# Spec: Wind rose", "# Wind rose")),
    ).toEqual(["missing a `# Spec: <title>` heading"]);
  });

  it("rejects a spec without the link back to its intent", () => {
    expect(
      validateSpec(spec.replace("[intent.md](intent.md)", "the intent")),
    ).toEqual(["missing the link back to `intent.md`"]);
  });

  it.each(requiredSections)(
    "rejects a spec without the %s section",
    (section) => {
      expect(validateSpec(spec.replace(`## ${section}\n`, ""))).toEqual([
        `missing the \`## ${section}\` section`,
      ]);
    },
  );

  it("rejects a runaway spec", () => {
    expect(validateSpec(spec + "x".repeat(60_001))).toEqual([
      "longer than 60000 characters",
    ]);
  });
});

describe("unresolvedQuestions", () => {
  it("reads numbered and bulleted items from the final section", () => {
    const text = `${spec}\n## Unresolved questions\n\n1. Which colour?\n- Which unit?\n`;
    expect(unresolvedQuestions(text)).toEqual(["Which colour?", "Which unit?"]);
  });

  it("stops at the next section", () => {
    const text = `# Spec: A\n\n## Unresolved questions\n\n1. Which colour?\n\n## Docs\n\n1. Not a question.\n`;
    expect(unresolvedQuestions(text)).toEqual(["Which colour?"]);
  });

  it("is empty without the section", () => {
    expect(unresolvedQuestions(spec)).toEqual([]);
  });
});

describe("pullRequestBody", () => {
  const run = "https://github.com/newell-paul/sprint-scout/actions/runs/1";

  it("lists unresolved questions first", () => {
    const body = pullRequestBody("wind-rose", ["Which colour?"], run);
    expect(body.indexOf("1. Which colour?")).toBeLessThan(
      body.indexOf("Drafted"),
    );
    expect(body).toContain("stays a draft");
  });

  it("links the intent and the run without unresolved questions", () => {
    const body = pullRequestBody("wind-rose", [], run);
    expect(body).not.toContain("Unresolved");
    expect(body).toContain("intent/wind-rose/intent.md");
    expect(body).toContain(run);
  });
});

it("reads the title from the spec heading", () => {
  expect(specTitle(spec)).toBe("Wind rose");
  expect(specTitle("no heading")).toBe("untitled");
});
