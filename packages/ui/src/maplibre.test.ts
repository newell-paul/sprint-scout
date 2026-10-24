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

describe("clickToActivate", () => {
  const handler = () => ({
    enabled: true,
    enable() {
      this.enabled = true;
    },
    disable() {
      this.enabled = false;
    },
  });
  const event = (type: string, props: object = {}) =>
    Object.assign(new Event(type), props);

  function setup() {
    vi.useFakeTimers();
    const doc = Object.assign(new EventTarget(), {
      createElement: () =>
        Object.assign(new EventTarget(), {
          style: {},
          textContent: "",
          setAttribute() {},
          remove: vi.fn(),
        }),
    });
    const children: unknown[] = [];
    const outside = new EventTarget();
    const element = Object.assign(new EventTarget(), {
      ownerDocument: doc,
      dataset: {} as Record<string, string>,
      append: (child: unknown) => children.push(child),
      contains: (node: unknown) => node === element || children.includes(node),
    });
    const map = {
      scrollZoom: handler(),
      dragPan: handler(),
      touchZoomRotate: handler(),
    };
    const enabled = () =>
      [map.scrollZoom, map.dragPan, map.touchZoomRotate].map((h) => h.enabled);
    const hint = () =>
      children[0] as {
        style: { display: string };
        textContent: string;
        remove: () => void;
      };
    return { doc, element, outside, map, enabled, hint };
  }

  async function start(
    options?: Parameters<typeof import("./maplibre").clickToActivate>[2],
  ) {
    const { clickToActivate } = await import("./maplibre");
    const s = setup();
    const activation = clickToActivate(
      s.map as never,
      s.element as never,
      options,
    );
    return { ...s, activation, cleanup: activation.dispose };
  }

  it("starts with wheel, drag and touch gestures off", async () => {
    const { enabled, element } = await start();
    expect(enabled()).toEqual([false, false, false]);
    expect(element.dataset.mapActive).toBe("false");
  });

  it("activates on a mouse press and releases when the mouse leaves", async () => {
    const { element, enabled } = await start();
    element.dispatchEvent(event("pointerdown", { pointerType: "mouse" }));
    expect(enabled()).toEqual([true, true, true]);
    expect(element.dataset.mapActive).toBe("true");
    element.dispatchEvent(event("pointerleave", { pointerType: "mouse" }));
    expect(enabled()).toEqual([false, false, false]);
  });

  it("needs a tap on touch, and a finger lifting off does not release it", async () => {
    const { element, enabled } = await start();
    element.dispatchEvent(event("pointerdown", { pointerType: "touch" }));
    expect(enabled()).toEqual([false, false, false]);
    element.dispatchEvent(event("click"));
    element.dispatchEvent(event("pointerleave", { pointerType: "touch" }));
    expect(enabled()).toEqual([true, true, true]);
  });

  it("releases on a press outside the map but not inside it", async () => {
    const { doc, element, outside, enabled } = await start();
    element.dispatchEvent(event("click"));
    const inside = event("pointerdown", { pointerType: "touch" });
    Object.defineProperty(inside, "target", { value: element });
    doc.dispatchEvent(inside);
    expect(enabled()).toEqual([true, true, true]);
    const away = event("pointerdown");
    Object.defineProperty(away, "target", { value: outside });
    doc.dispatchEvent(away);
    expect(enabled()).toEqual([false, false, false]);
  });

  it("releases when focus leaves the map but not when it moves within", async () => {
    const { element, outside, enabled } = await start();
    element.dispatchEvent(event("click"));
    element.dispatchEvent(event("focusout", { relatedTarget: element }));
    expect(enabled()).toEqual([true, true, true]);
    element.dispatchEvent(event("focusout", { relatedTarget: outside }));
    expect(enabled()).toEqual([false, false, false]);
  });

  it("hints how to activate only while inactive, then hides the hint", async () => {
    const { element, hint } = await start();
    element.dispatchEvent(event("wheel"));
    expect(hint().style.display).toBe("block");
    expect(hint().textContent).toBe("Click the map to zoom");
    vi.advanceTimersByTime(1500);
    expect(hint().style.display).toBe("none");
    element.dispatchEvent(event("touchmove"));
    expect(hint().textContent).toBe("Tap the map to move it");
    element.dispatchEvent(event("click"));
    expect(hint().style.display).toBe("none");
    element.dispatchEvent(event("wheel"));
    expect(hint().style.display).toBe("none");
  });

  it("reports the activating press once, so a drawing map can skip it", async () => {
    const { element, activation } = await start();
    element.dispatchEvent(event("pointerdown", { pointerType: "mouse" }));
    element.dispatchEvent(event("click"));
    expect(activation.takeActivation()).toBe(true);
    expect(activation.takeActivation()).toBe(false);
    element.dispatchEvent(event("pointerdown", { pointerType: "mouse" }));
    element.dispatchEvent(event("click"));
    expect(activation.takeActivation()).toBe(false);
  });

  it("reports a tap that activates, but not a later tap", async () => {
    const { element, activation } = await start();
    element.dispatchEvent(event("pointerdown", { pointerType: "touch" }));
    element.dispatchEvent(event("click"));
    expect(activation.takeActivation()).toBe(true);
    element.dispatchEvent(event("pointerdown", { pointerType: "touch" }));
    element.dispatchEvent(event("click"));
    expect(activation.takeActivation()).toBe(false);
  });

  it("keeps control when the mouse leaves while holdOnLeave says so", async () => {
    let hold = true;
    const { element, enabled } = await start({ holdOnLeave: () => hold });
    element.dispatchEvent(event("pointerdown", { pointerType: "mouse" }));
    element.dispatchEvent(event("pointerleave", { pointerType: "mouse" }));
    expect(enabled()).toEqual([true, true, true]);
    hold = false;
    element.dispatchEvent(event("pointerleave", { pointerType: "mouse" }));
    expect(enabled()).toEqual([false, false, false]);
  });

  it("shows the hover hint while the mouse rests on the inactive map", async () => {
    const { element, hint } = await start({ hint: "Click to use the map" });
    element.dispatchEvent(event("pointerenter", { pointerType: "touch" }));
    expect(hint().style.display).toBe("none");
    element.dispatchEvent(event("pointerenter", { pointerType: "mouse" }));
    expect(hint().textContent).toBe("Click to use the map");
    vi.advanceTimersByTime(5000);
    expect(hint().style.display).toBe("block");
    element.dispatchEvent(event("pointerleave", { pointerType: "mouse" }));
    expect(hint().style.display).toBe("none");
    element.dispatchEvent(event("pointerenter", { pointerType: "mouse" }));
    element.dispatchEvent(event("pointerdown", { pointerType: "mouse" }));
    expect(hint().style.display).toBe("none");
  });

  it("shows no hover hint without one", async () => {
    const { element, hint } = await start();
    element.dispatchEvent(event("pointerenter", { pointerType: "mouse" }));
    expect(hint().style.display).toBe("none");
  });

  it("cleanup removes the release listeners, so nothing switches the map back off", async () => {
    const { doc, element, outside, enabled, cleanup } = await start();
    element.dispatchEvent(event("click"));
    cleanup();
    const away = event("pointerdown");
    Object.defineProperty(away, "target", { value: outside });
    doc.dispatchEvent(away);
    element.dispatchEvent(event("focusout", { relatedTarget: outside }));
    element.dispatchEvent(event("pointerleave", { pointerType: "mouse" }));
    expect(enabled()).toEqual([true, true, true]);
  });

  it("cleanup removes the hint and every listener", async () => {
    const { doc, element, outside, enabled, hint, cleanup } = await start({
      hint: "Click to use the map",
    });
    cleanup();
    expect(hint().remove).toHaveBeenCalled();
    element.dispatchEvent(event("click"));
    expect(enabled()).toEqual([false, false, false]);
    element.dispatchEvent(event("pointerdown", { pointerType: "mouse" }));
    element.dispatchEvent(event("wheel"));
    element.dispatchEvent(event("touchmove"));
    element.dispatchEvent(event("pointerenter", { pointerType: "mouse" }));
    expect(hint().style.display).toBe("none");
    expect(enabled()).toEqual([false, false, false]);
    const away = event("pointerdown");
    Object.defineProperty(away, "target", { value: outside });
    doc.dispatchEvent(away);
    element.dispatchEvent(event("focusout", { relatedTarget: outside }));
    element.dispatchEvent(event("pointerleave", { pointerType: "mouse" }));
    expect(enabled()).toEqual([false, false, false]);
  });
});
