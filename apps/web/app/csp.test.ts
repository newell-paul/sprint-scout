import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "./csp";

const directive = (name: string) =>
  contentSecurityPolicy
    .split("; ")
    .find((part) => part.startsWith(`${name} `))
    ?.split(" ")
    .slice(1);

describe("content security policy", () => {
  it("lets the page reach only itself, Open-Meteo and the map tiles", () => {
    expect(directive("default-src")).toEqual(["'self'"]);
    expect(directive("connect-src")).toEqual([
      "'self'",
      "https://api.open-meteo.com",
      "https://archive-api.open-meteo.com",
      "https://tile.openstreetmap.org",
    ]);
    expect(directive("img-src")).toEqual([
      "'self'",
      "data:",
      "blob:",
      "https://tile.openstreetmap.org",
    ]);
  });

  it("never allows eval, plugins or a foreign base URL", () => {
    expect(contentSecurityPolicy).not.toContain("unsafe-eval");
    expect(directive("object-src")).toEqual(["'none'"]);
    expect(directive("base-uri")).toEqual(["'self'"]);
  });
});
