import { describe, expect, it, vi } from "vitest";
import { fetchOpenMeteo } from "./open-meteo-fetch";

const url = new URL("https://api.open-meteo.com/v1/forecast");
const request = (response: Response, maxBytes = 100) => {
  const fetcher = vi.fn<typeof fetch>(async () => response);
  const result = fetchOpenMeteo(url, {
    service: "Weather service",
    body: "Weather",
    maxBytes,
    signal: new AbortController().signal,
    fetcher,
  });
  return { result, fetcher };
};
/** A body that arrives in chunks, so the cap must hold before the end. */
const streamed = (chunks: string[]) =>
  new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks)
          controller.enqueue(new TextEncoder().encode(chunk));
        controller.close();
      },
    }),
  );

describe("Open-Meteo request", () => {
  it("sends no credentials, referrer or cache and refuses redirects", async () => {
    const { result, fetcher } = request(new Response('{"ok":true}'));
    await expect(result).resolves.toEqual({ ok: true });
    expect(fetcher.mock.calls[0]![1]).toMatchObject({
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      redirect: "error",
    });
  });
  it("stops reading once the streamed body passes the cap", async () => {
    const { result } = request(streamed(['{"a":"', "x".repeat(60), '"}']), 50);
    await expect(result).rejects.toThrow("Weather response is too large.");
  });
  it("reads a body that arrives in parts up to the cap", async () => {
    const { result } = request(streamed(['{"a":', "1}"]), 7);
    await expect(result).resolves.toEqual({ a: 1 });
  });
  it("names the service for outages and rate limits, and the empty body", async () => {
    await expect(
      request(new Response("", { status: 503 })).result,
    ).rejects.toThrow("Weather service unavailable. Try again.");
    await expect(
      request(new Response("", { status: 429 })).result,
    ).rejects.toThrow("Weather service rate limit reached. Try again later.");
    await expect(request(new Response(null)).result).rejects.toThrow(
      "Empty weather response.",
    );
  });
});
