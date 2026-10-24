"use client";
import { useEffect, useRef, useState } from "react";
import type { EChartsType } from "echarts/core";
import type { PlannerHour } from "@scout/contracts";
export default function HourChart({
  rows,
  attemptAt,
  onSelect,
}: {
  rows: PlannerHour[];
  attemptAt: string;
  onSelect: (at: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null),
    chart = useRef<EChartsType | null>(null),
    onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    let resize: ResizeObserver | undefined;
    Promise.all([
      import("echarts/core"),
      import("echarts/charts"),
      import("echarts/components"),
      import("echarts/renderers"),
    ])
      .then(([core, charts, components, renderers]) => {
        if (disposed || !container.current) return;
        core.use([
          charts.LineChart,
          components.GridComponent,
          components.TooltipComponent,
          components.MarkLineComponent,
          renderers.SVGRenderer,
        ]);
        const instance = core.init(container.current, undefined, {
          renderer: "svg",
        });
        chart.current = instance;
        instance.on("click", (event: unknown) => {
          const e = event as { data?: { at?: string } };
          if (e.data?.at) onSelectRef.current(e.data.at);
        });
        resize = new ResizeObserver(() => instance.resize());
        resize.observe(container.current);
        setReady(true);
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      resize?.disconnect();
      chart.current?.dispose();
      chart.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !chart.current) return;
    const label = (at: string) =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: rows[0]?.timeZone ?? "UTC",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "shortOffset",
      }).format(new Date(at));
    chart.current.setOption(
      {
        animation: false,
        grid: { top: 22, left: 45, right: 20, bottom: 48 },
        tooltip: { trigger: "axis", renderMode: "richText" },
        xAxis: {
          type: "category",
          data: rows.map((r) => label(r.attemptAt)),
          axisLabel: { color: "#53636b", fontSize: 10 },
        },
        yAxis: {
          type: "value",
          name: "m/s",
          axisLabel: { color: "#53636b" },
          splitLine: { lineStyle: { color: "#dbe3e5" } },
        },
        series: [
          {
            name: "Tailwind (+) / headwind (−)",
            type: "line",
            smooth: false,
            symbolSize: 9,
            lineStyle: { width: 3, color: "#00796d" },
            itemStyle: { color: "#00796d" },
            data: rows.map((r) => ({
              value: Number(r.tailwindMps.toFixed(2)),
              at: r.attemptAt,
            })),
            markLine: {
              silent: true,
              symbol: "none",
              label: { show: false },
              lineStyle: { color: "#53636b", type: "dashed" },
              data: [{ xAxis: label(attemptAt) }],
            },
          },
          {
            name: "Absolute crosswind",
            type: "line",
            smooth: false,
            symbol: "diamond",
            symbolSize: 7,
            lineStyle: { color: "#ad6600", type: "dashed" },
            itemStyle: { color: "#ad6600" },
            data: rows.map((r) => ({
              value: Number(r.meanAbsCrosswindMps.toFixed(2)),
              at: r.attemptAt,
            })),
          },
        ],
      },
      true,
    );
  }, [rows, attemptAt, ready]);
  return (
    <div
      role="group"
      data-testid="hour-chart"
      data-attempt={attemptAt}
      data-chart-ready={ready ? "true" : "false"}
      aria-label="Hourly wind chart. Use the table below to select any hour."
    >
      <div className="chart-canvas" ref={container} aria-hidden="true" />
      {failed ? (
        <p role="status">Chart unavailable. Use the hourly table below.</p>
      ) : null}
    </div>
  );
}
