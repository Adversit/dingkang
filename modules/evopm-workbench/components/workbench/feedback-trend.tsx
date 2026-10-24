"use client";

import { useId, useMemo } from "react";
import { ChartNoAxesCombined } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Signal } from "@/modules/evopm-workbench/lib/contracts";

const DAY_MS = 24 * 60 * 60 * 1000;
const shanghaiDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function shanghaiDay(date: Date): string {
  const parts = shanghaiDayFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function FeedbackTrend({
  signals,
  known,
}: {
  signals: Signal[];
  known: boolean;
}) {
  const gradientId = `feedback-trend-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const today = shanghaiDay(new Date());
  const points = useMemo(() => {
    // UTC is used only for calendar arithmetic; keys are Shanghai calendar days.
    const lastDay = new Date(`${today}T00:00:00.000Z`).getTime();
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(lastDay - (6 - index) * DAY_MS)
        .toISOString()
        .slice(0, 10);
      return { day, label: day.slice(5).replace("-", "/"), count: 0 };
    });
    if (!known) return days;

    const byDay = new Map(days.map((day) => [day.day, day]));
    for (const signal of signals) {
      const timestamp = new Date(signal.createdAt);
      if (!Number.isFinite(timestamp.getTime())) continue;
      const day = byDay.get(shanghaiDay(timestamp));
      if (day) day.count += 1;
    }
    return days;
  }, [signals, today, known]);
  const total = points.reduce((sum, day) => sum + day.count, 0);

  if (!known) {
    return (
      <div className="feedback-trend">
        <div className="chart-frame chart-unavailable" role="status">
          <ChartNoAxesCombined size={34} strokeWidth={1.2} aria-hidden="true" />
          <p>数据加载后显示趋势</p>
        </div>
        <p className="chart-summary">按北京时间统计最近 7 天的新增反馈</p>
      </div>
    );
  }

  return (
    <div className="feedback-trend">
      <div
        className="chart-frame"
        role="img"
        aria-label={`最近 7 天共新增 ${total} 条反馈。${points
          .map((day) => `${day.label}：${day.count} 条`)
          .join("；")}`}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={points} margin={{ top: 12, right: 12, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.24} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.015} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e8e8ef" strokeDasharray="3 5" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={{ fontSize: 11, fill: "#8c8c9d" }}
              tickMargin={10}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              domain={[0, (maximum: number) => Math.max(1, maximum)]}
              tick={{ fontSize: 11, fill: "#8c8c9d" }}
              width={38}
            />
            <Tooltip
              formatter={(value) => [`${value ?? 0} 条`, "反馈数量"]}
              labelFormatter={(label) => `${String(label)} · 北京时间`}
              cursor={{ stroke: "#c4b5fd", strokeDasharray: "3 4" }}
            />
            <Area
              type="monotone"
              dataKey="count"
              name="反馈数量"
              stroke="#8b5cf6"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, stroke: "#ffffff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-summary">
        {total === 0
          ? "最近 7 天暂无新增反馈，已加载数据为 0 条"
          : `最近 7 天新增 ${total} 条反馈 · 按北京时间统计`}
      </p>
    </div>
  );
}
