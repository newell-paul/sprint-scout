"use client";
import { useEffect, useRef, useState } from "react";
import { nextFreeSlot, type DrawnRoute } from "./library";
import { thumbnailPath, thumbnailPoints } from "./thumbnail";
export default function SegmentSlots({
  routes,
  active,
  onSelect,
  disabled = false,
}: {
  routes: DrawnRoute[];
  active: number;
  onSelect: (slot: number) => void;
  disabled?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const activeButton = useRef<HTMLButtonElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const emptySlot = routes.some((route) => route.slot === active)
    ? nextFreeSlot(routes)
    : active;
  const slots = [...routes.map((route) => route.slot), emptySlot].sort(
    (left, right) => left - right,
  );
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const update = () => {
      setCanScrollLeft(element.scrollLeft > 1);
      setCanScrollRight(
        element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
      );
    };
    update();
    element.addEventListener("scroll", update);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [routes, active]);
  useEffect(() => {
    const element = scroller.current;
    const button = activeButton.current;
    if (!element || !button) return;
    const bounds = element.getBoundingClientRect();
    const selected = button.getBoundingClientRect();
    if (selected.left < bounds.left)
      element.scrollLeft -= bounds.left - selected.left + 4;
    else if (selected.right > bounds.right)
      element.scrollLeft += selected.right - bounds.right + 4;
  }, [active, routes]);
  const scroll = (direction: number) => {
    const element = scroller.current;
    if (element)
      element.scrollBy({ left: direction * element.clientWidth * 0.8 });
  };
  return (
    <div className="segment-carousel">
      <button
        type="button"
        className="segment-scroll"
        aria-label="Scroll segments left"
        disabled={!canScrollLeft}
        onClick={() => scroll(-1)}
      >
        ‹
      </button>
      <div
        ref={scroller}
        className="segment-slots"
        role="group"
        aria-label="Segments"
        tabIndex={disabled ? 0 : undefined}
      >
        {slots.map((i) => {
          const route = routes.find((r) => r.slot === i);
          return (
            <button
              key={i}
              ref={i === active ? activeButton : undefined}
              type="button"
              disabled={disabled}
              className={`segment-slot${route ? " defined" : " empty"}${i === active ? " active" : ""}`}
              aria-pressed={i === active}
              aria-label={
                route
                  ? `Segment ${i + 1}: ${route.name}`
                  : `Segment ${i + 1}: empty, draw a segment`
              }
              title={route ? route.name : "Empty — click to draw"}
              data-testid={`segment-slot-${i + 1}`}
              data-defined={route ? "true" : "false"}
              onClick={() => onSelect(i)}
            >
              <svg viewBox="0 0 32 32" aria-hidden="true">
                {route ? (
                  (() => {
                    const pts = thumbnailPoints(route.points, 32, 5);
                    const first = pts[0]!,
                      last = pts[pts.length - 1]!;
                    return (
                      <>
                        <path
                          d={thumbnailPath(pts)}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx={first[0]}
                          cy={first[1]}
                          r="3.2"
                          fill="var(--segment-dot)"
                        />
                        <circle
                          cx={last[0]}
                          cy={last[1]}
                          r="3.2"
                          fill="var(--segment-dot)"
                        />
                      </>
                    );
                  })()
                ) : (
                  <path
                    d="M16 7 V25 M7 16 H25"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <span className="segment-slot-number">{i + 1}</span>
              <span className="segment-slot-name">
                {route?.name ?? "Add segment"}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="segment-scroll"
        aria-label="Scroll segments right"
        disabled={!canScrollRight}
        onClick={() => scroll(1)}
      >
        ›
      </button>
    </div>
  );
}
