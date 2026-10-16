import type { RouteWindForecast } from "@scout/application/route-wind";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadRouteWind = vi.fn();
vi.mock("@scout/application/route-wind", () => ({ loadRouteWind }));

const point: [number, number] = [51.44, -0.27];
const forecast = (expiresAt: number) =>
  ({ expiresAt }) as unknown as RouteWindForecast;

beforeEach(() => {
  vi.resetModules();
  loadRouteWind.mockReset();
  vi.stubGlobal("window", globalThis);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("getRouteForecast", () => {
  it("shares one request between points equal to four decimal places", async () => {
    const { getRouteForecast } = await import("./forecast-cache");
    loadRouteWind.mockResolvedValue(forecast(Date.now() + 60_000));
    const [a, b] = await Promise.all([
      getRouteForecast(point, true),
      getRouteForecast([51.44001, -0.27004], true),
    ]);
    expect(a).toBe(b);
    expect(loadRouteWind).toHaveBeenCalledTimes(1);
  });

  it("sends the save-time confirmation as both source and weather consent", async () => {
    const { getRouteForecast } = await import("./forecast-cache");
    loadRouteWind.mockResolvedValue(forecast(Date.now() + 60_000));
    await getRouteForecast(point, false);
    expect(loadRouteWind).toHaveBeenCalledWith(
      { point, independentConfirmed: false, weatherConsent: false },
      expect.any(AbortSignal),
    );
  });

  it("fetches again once the cached forecast has expired", async () => {
    const { getRouteForecast } = await import("./forecast-cache");
    const fresh = forecast(Date.now() + 60_000);
    loadRouteWind
      .mockResolvedValueOnce(forecast(Date.now() - 1))
      .mockResolvedValueOnce(fresh);
    await getRouteForecast(point, true);
    expect(await getRouteForecast(point, true)).toBe(fresh);
    expect(loadRouteWind).toHaveBeenCalledTimes(2);
  });

  it("bypasses the cache when forced", async () => {
    const { getRouteForecast } = await import("./forecast-cache");
    loadRouteWind.mockResolvedValue(forecast(Date.now() + 60_000));
    await getRouteForecast(point, true);
    await getRouteForecast(point, true, { force: true });
    expect(loadRouteWind).toHaveBeenCalledTimes(2);
  });

  it("does not cache a failed request, so a retry can succeed", async () => {
    const { getRouteForecast } = await import("./forecast-cache");
    const fresh = forecast(Date.now() + 60_000);
    loadRouteWind
      .mockRejectedValueOnce(new Error("rate limited"))
      .mockResolvedValueOnce(fresh);
    await expect(getRouteForecast(point, true)).rejects.toThrow("rate limited");
    expect(await getRouteForecast(point, true)).toBe(fresh);
  });

  it("aborts the request after the timeout", async () => {
    vi.useFakeTimers();
    const { getRouteForecast } = await import("./forecast-cache");
    loadRouteWind.mockImplementation(
      (_input, signal: AbortSignal) =>
        new Promise((_, reject) =>
          signal.addEventListener("abort", () => reject(signal.reason)),
        ),
    );
    const request = getRouteForecast(point, true, { timeoutMs: 500 });
    const outcome = request.then(
      () => "resolved",
      () => "rejected",
    );
    await vi.advanceTimersByTimeAsync(499);
    expect(loadRouteWind.mock.calls[0]![1].aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await outcome).toBe("rejected");
  });
});

describe("peekRouteForecast", () => {
  it("returns a forecast only once it has settled and while it is fresh", async () => {
    vi.useFakeTimers();
    const { getRouteForecast, peekRouteForecast } =
      await import("./forecast-cache");
    const fresh = forecast(Date.now() + 60_000);
    loadRouteWind.mockResolvedValue(fresh);
    const request = getRouteForecast(point, true);
    expect(peekRouteForecast(point)).toBeNull();
    await request;
    expect(peekRouteForecast(point)).toBe(fresh);
    vi.advanceTimersByTime(60_000);
    expect(peekRouteForecast(point)).toBeNull();
  });
});
