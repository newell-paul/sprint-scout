import { beforeEach, describe, expect, it, vi } from "vitest";

const setWorkerUrl = vi.fn();
vi.mock("maplibre-gl", () => ({ setWorkerUrl }));

beforeEach(() => {
  vi.resetModules();
  setWorkerUrl.mockReset();
});

describe("loadMapLibre", () => {
  it("does not cache a failed load, so a retry can succeed", async () => {
    const { loadMapLibre } = await import("./maplibre");
    setWorkerUrl.mockImplementationOnce(() => {
      throw new Error("worker unavailable");
    });
    await expect(loadMapLibre()).rejects.toThrow("worker unavailable");
    await expect(loadMapLibre()).resolves.toMatchObject({ setWorkerUrl });
    expect(setWorkerUrl).toHaveBeenCalledTimes(2);
  });

  it("returns the same library for repeated loads", async () => {
    const { loadMapLibre } = await import("./maplibre");
    const first = await loadMapLibre();
    expect(await loadMapLibre()).toBe(first);
    expect(setWorkerUrl).toHaveBeenCalledTimes(1);
  });
});

describe("configureMapLibre", () => {
  it("applies a worker URL configured before the load", async () => {
    const { configureMapLibre, loadMapLibre } = await import("./maplibre");
    configureMapLibre({ workerUrl: "blob:worker" });
    await loadMapLibre();
    expect(setWorkerUrl).toHaveBeenLastCalledWith("blob:worker");
  });

  it("applies a worker URL configured after the load", async () => {
    const { configureMapLibre, loadMapLibre } = await import("./maplibre");
    await loadMapLibre();
    configureMapLibre({ workerUrl: "blob:late" });
    expect(setWorkerUrl).toHaveBeenLastCalledWith("blob:late");
    expect(setWorkerUrl).toHaveBeenCalledTimes(2);
  });
});
