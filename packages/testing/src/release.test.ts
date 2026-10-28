import { describe, expect, it } from "vitest";
import { nextVersion, releaseNotes, type ReleaseIntent } from "./release";

const intent = (slug: string, status: string, title = slug): ReleaseIntent => ({
  slug,
  text: `# ${title}\n\nStatus: ${status}\nOpened: 1 October 2026 by Paul Newell\n`,
});
const repo = "newell-paul/sprint-scout";

describe("releaseNotes", () => {
  it("lists every done intent on the first release", () => {
    const notes = releaseNotes({
      repo,
      tag: "v0.9.0",
      intents: [
        intent("wind-toggle", "done", "Wind toggle"),
        intent("bands", "done", "Bands"),
      ],
      previous: null,
    });
    expect(notes).toBe(
      [
        "First tagged release. Intents done:",
        "",
        "- [Bands](https://github.com/newell-paul/sprint-scout/blob/v0.9.0/intent/bands/intent.md)",
        "- [Wind toggle](https://github.com/newell-paul/sprint-scout/blob/v0.9.0/intent/wind-toggle/intent.md)",
        "",
      ].join("\n"),
    );
  });

  it("lists only intents done since the previous tag", () => {
    const notes = releaseNotes({
      repo,
      tag: "v0.10.0",
      intents: [
        intent("old", "done"),
        intent("finished", "done", "Finished now"),
        intent("brand-new", "done", "Brand new"),
      ],
      previous: {
        tag: "v0.9.0",
        statuses: { old: "done", finished: "in build" },
      },
    });
    expect(notes).toBe(
      [
        "Intents done since v0.9.0:",
        "",
        "- [Brand new](https://github.com/newell-paul/sprint-scout/blob/v0.10.0/intent/brand-new/intent.md)",
        "- [Finished now](https://github.com/newell-paul/sprint-scout/blob/v0.10.0/intent/finished/intent.md)",
        "",
      ].join("\n"),
    );
  });

  it("leaves out intents that are not done", () => {
    const notes = releaseNotes({
      repo,
      tag: "v0.9.1",
      intents: [
        intent("a", "dropped"),
        intent("b", "in build"),
        intent("c", "accepted"),
        intent("d", "draft"),
      ],
      previous: { tag: "v0.9.0", statuses: {} },
    });
    expect(notes).toBe("No intents completed since v0.9.0.\n");
  });

  it("says so when the first release has nothing done", () => {
    expect(
      releaseNotes({ repo, tag: "v0.1.0", intents: [], previous: null }),
    ).toBe("First tagged release. No intents completed yet.\n");
  });

  it("sorts by slug in code-unit order and falls back to the slug as title", () => {
    const notes = releaseNotes({
      repo,
      tag: "v1.0.0",
      intents: [
        { slug: "b-two", text: "Status: done\n" },
        intent("B-one", "done"),
        intent("a", "done"),
      ],
      previous: { tag: "v0.9.0", statuses: {} },
    });
    expect(notes.match(/\[([^\]]+)\]/g)).toEqual(["[B-one]", "[a]", "[b-two]"]);
  });
});

describe("nextVersion", () => {
  it("accepts a greater version", () => {
    expect(nextVersion("0.9.0", "0.9.1")).toBe("0.9.1");
    expect(nextVersion("0.9.0", "0.10.0")).toBe("0.10.0");
    expect(nextVersion("0.9.9", "1.0.0")).toBe("1.0.0");
  });

  it("accepts any version when there is none yet", () => {
    expect(nextVersion(undefined, "0.9.0")).toBe("0.9.0");
  });

  it.each([
    ["0.9.0", "0.9.0", "greater than 0.9.0"],
    ["0.9.0", "0.8.9", "greater than 0.9.0"],
    ["0.10.0", "0.9.0", "greater than 0.10.0"],
    ["0.9.0", "v0.9.1", "x.y.z"],
    ["0.9.0", "0.9.1-rc.1", "x.y.z"],
    ["0.9.0", "01.0.0", "x.y.z"],
    ["0.9.0", "", "x.y.z"],
  ])("rejects %s to %s", (current, requested, message) => {
    expect(() => nextVersion(current, requested)).toThrow(message);
  });
});
