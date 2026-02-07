import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceDot,
} from "recharts";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SleepEntry } from "@shared/schema";
import { getAllEntries } from "@/lib/storage";
import {
  calculateMetrics,
  formatDuration,
  formatEfficiency,
  getWeekRange,
  getMonthRange,
  getDaysInRange,
  formatShortDate,
  getSleepQuality,
  getCalendarDays,
  formatMonthYear,
  toDateString,
  type SleepQuality,
} from "@/lib/sleepUtils";

const SLEEP_COLOR = "hsl(230, 58%, 68%)";
const SUBSTANCE_COLOR = "hsl(35, 65%, 58%)";
const REFLECTION_COLOR = "hsl(30, 15%, 65%)";
const GRID = "rgba(255, 255, 255, 0.03)";
const AXIS = "rgba(255, 255, 255, 0.2)";

const QUALITY_COLORS: Record<SleepQuality, string> = {
  good: "bg-emerald-500",
  ok: "bg-amber-500",
  poor: "bg-red-500",
};

export default function DashboardPage() {
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [period, setPeriod] = useState<"week" | "month">("week");

  const todayStr = toDateString(new Date());
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  useEffect(() => {
    setEntries(getAllEntries());
  }, []);

  const range = period === "week" ? getWeekRange() : getMonthRange();

  const filtered = useMemo(
    () => entries.filter((e) => e.date >= range.start && e.date <= range.end),
    [entries, range.start, range.end]
  );

  const chartData = useMemo(() => {
    const dates = getDaysInRange(range.start, range.end);
    return dates.map((d) => {
      const entry = filtered.find((e) => e.date === d);
      if (!entry)
        return {
          date: formatShortDate(d),
          sleepHours: null,
          efficiency: null,
          feeling: null,
          hasDrinks: false,
          hasWeed: false,
        };
      const m = calculateMetrics(entry);
      return {
        date: formatShortDate(d),
        sleepHours: Math.round((m.totalSleep / 60) * 10) / 10,
        efficiency: Math.round(m.sleepEfficiency),
        feeling: entry.feeling,
        hasDrinks: entry.drinks > 0,
        hasWeed: entry.weed,
      };
    });
  }, [filtered, range]);

  const averages = useMemo(() => {
    if (filtered.length === 0) return null;
    const metrics = filtered.map((e) => calculateMetrics(e));
    return {
      avgSleep:
        metrics.reduce((s, m) => s + m.totalSleep, 0) / metrics.length,
      avgEff:
        metrics.reduce((s, m) => s + m.sleepEfficiency, 0) / metrics.length,
      avgFeel:
        filtered.reduce((s, e) => s + e.feeling, 0) / filtered.length,
      count: filtered.length,
    };
  }, [filtered]);

  const prevPeriodAvg = useMemo(() => {
    if (filtered.length === 0) return null;
    const dayCount = period === "week" ? 7 : 30;
    const prevStart = new Date(range.start);
    prevStart.setDate(prevStart.getDate() - dayCount);
    const prevStartStr = toDateString(prevStart);
    const prevEnd = range.start;
    const prevFiltered = entries.filter((e) => e.date >= prevStartStr && e.date < prevEnd);
    if (prevFiltered.length === 0) return null;
    const metrics = prevFiltered.map((e) => calculateMetrics(e));
    return {
      avgSleep: metrics.reduce((s, m) => s + m.totalSleep, 0) / metrics.length,
      avgEff: metrics.reduce((s, m) => s + m.sleepEfficiency, 0) / metrics.length,
    };
  }, [entries, filtered, range, period]);

  const sleepTrend = useMemo(() => {
    if (!averages || !prevPeriodAvg) return "flat" as const;
    const diff = averages.avgSleep - prevPeriodAvg.avgSleep;
    if (diff > 15) return "up" as const;
    if (diff < -15) return "down" as const;
    return "flat" as const;
  }, [averages, prevPeriodAvg]);

  const correlations = useMemo(() => {
    if (filtered.length < 2) return null;

    const calc = (arr: SleepEntry[]) => {
      if (arr.length === 0) return { sleep: 0, eff: 0, feel: 0, count: 0 };
      const ms = arr.map((e) => calculateMetrics(e));
      return {
        sleep: ms.reduce((s, m) => s + m.totalSleep, 0) / ms.length,
        eff: ms.reduce((s, m) => s + m.sleepEfficiency, 0) / ms.length,
        feel: arr.reduce((s, e) => s + e.feeling, 0) / arr.length,
        count: arr.length,
      };
    };

    const withD = filtered.filter((e) => e.drinks > 0);
    const noD = filtered.filter((e) => e.drinks === 0);
    const withW = filtered.filter((e) => e.weed);
    const noW = filtered.filter((e) => !e.weed);

    return {
      drinks:
        withD.length > 0 && noD.length > 0
          ? { with: calc(withD), without: calc(noD) }
          : null,
      weed:
        withW.length > 0 && noW.length > 0
          ? { with: calc(withW), without: calc(noW) }
          : null,
    };
  }, [filtered]);

  const entryQualityMap = useMemo(() => {
    const map: Record<string, SleepQuality> = {};
    entries.forEach((e) => {
      map[e.date] = getSleepQuality(e);
    });
    return map;
  }, [entries]);

  const substanceDots = useMemo(() => {
    return chartData
      .map((d, i) => ({ ...d, index: i }))
      .filter((d) => d.hasDrinks || d.hasWeed);
  }, [chartData]);

  const calendarDays = getCalendarDays(calYear, calMonth);
  const dayHeaders = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalYear(calYear - 1);
      setCalMonth(11);
    } else {
      setCalMonth(calMonth - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalYear(calYear + 1);
      setCalMonth(0);
    } else {
      setCalMonth(calMonth + 1);
    }
  };

  return (
    <div className="px-5 pt-6 pb-24">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <h1 className="text-2xl font-medium tracking-tight">Stats</h1>
        <div className="flex gap-1">
          <Button
            variant={period === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setPeriod("week")}
            data-testid="button-period-week"
          >
            Week
          </Button>
          <Button
            variant={period === "month" ? "default" : "ghost"}
            size="sm"
            onClick={() => setPeriod("month")}
            data-testid="button-period-month"
          >
            Month
          </Button>
        </div>
      </div>

      {/* ── Hero Stats ── */}
      {averages && (
        <div className="mb-10">
          <div className="flex items-baseline justify-center gap-2 mb-1">
            <span
              className="text-4xl font-light tabular-nums text-foreground tracking-tight"
              data-testid="text-avg-sleep"
            >
              {formatDuration(averages.avgSleep)}
            </span>
            {sleepTrend === "up" && <TrendingUp className="w-4 h-4 text-emerald-500" />}
            {sleepTrend === "down" && <TrendingDown className="w-4 h-4 text-red-400" />}
            {sleepTrend === "flat" && <Minus className="w-3 h-3 text-muted-foreground/30" />}
          </div>
          <div className="text-[10px] text-muted-foreground/40 text-center uppercase tracking-[0.2em] mb-5">
            Avg sleep · {averages.count} nights
          </div>

          <div className="flex items-baseline justify-center gap-8">
            <div className="text-center">
              <div
                className="text-2xl font-light tabular-nums text-zone-sleep"
                data-testid="text-avg-eff"
              >
                {formatEfficiency(averages.avgEff)}
              </div>
              <div className="text-[10px] text-muted-foreground/40 mt-0.5 uppercase tracking-[0.2em]">
                Efficiency
              </div>
            </div>
            <div className="text-center">
              <div
                className="text-2xl font-light tabular-nums text-zone-reflection"
                data-testid="text-avg-feel"
              >
                {averages.avgFeel.toFixed(1)}
              </div>
              <div className="text-[10px] text-muted-foreground/40 mt-0.5 uppercase tracking-[0.2em]">
                Feeling
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Quality Calendar ── */}
      <div className="mb-10" data-testid="calendar-quality">
        <div className="flex items-center justify-between mb-4">
          <Button size="icon" variant="ghost" onClick={prevMonth} data-testid="button-quality-cal-prev">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm font-medium text-foreground" data-testid="text-quality-cal-month">
            {formatMonthYear(calYear, calMonth)}
          </span>
          <Button size="icon" variant="ghost" onClick={nextMonth} data-testid="button-quality-cal-next">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-0">
          {dayHeaders.map((d) => (
            <div key={d} className="text-center text-[10px] text-muted-foreground/30 pb-2 font-medium uppercase">
              {d}
            </div>
          ))}
          {calendarDays.map((cd, i) => {
            const quality = entryQualityMap[cd.date];
            const isFutureDay = cd.date > todayStr;
            const isCurrentMonth = cd.inMonth;

            return (
              <div
                key={i}
                className={cn(
                  "relative flex flex-col items-center justify-center py-2 text-sm",
                  !isCurrentMonth && "opacity-20",
                  isFutureDay && "opacity-10",
                  isCurrentMonth && !isFutureDay && "text-foreground/70"
                )}
                data-testid={`quality-day-${cd.date}`}
              >
                <span>{cd.day}</span>
                {quality && isCurrentMonth && !isFutureDay && (
                  <div className={cn("absolute bottom-0.5 w-2 h-2 rounded-full", QUALITY_COLORS[quality])} />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-5 mt-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">Good</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">OK</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">Poor</span>
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-muted-foreground/30 py-20">
          <div className="text-sm">No entries for this period</div>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          {/* ── Sleep Duration Chart ── */}
          <ChartSection title="Sleep duration" testId="chart-sleep">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
              >
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: AXIS, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={period === "month" ? 6 : 0}
                />
                <YAxis
                  tick={{ fill: AXIS, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                  unit="h"
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(215, 20%, 10%)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.3)" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="sleepHours"
                  stroke={SLEEP_COLOR}
                  strokeWidth={1.5}
                  dot={{ r: 2.5, fill: SLEEP_COLOR, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: SLEEP_COLOR, strokeWidth: 0 }}
                  connectNulls
                  name="Hours"
                />
                {substanceDots
                  .filter((d) => d.sleepHours !== null)
                  .map((d) => (
                    <ReferenceDot
                      key={`sub-${d.date}`}
                      x={d.date}
                      y={d.sleepHours!}
                      r={5}
                      fill="transparent"
                      stroke={SUBSTANCE_COLOR}
                      strokeWidth={1.5}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-end gap-3 mt-1">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full border border-zone-substance" />
                <span className="text-[10px] text-muted-foreground/30">Substance night</span>
              </div>
            </div>
          </ChartSection>

          {/* ── Efficiency Chart ── */}
          <ChartSection title="Sleep efficiency" testId="chart-eff">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
              >
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: AXIS, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={period === "month" ? 6 : 0}
                />
                <YAxis
                  tick={{ fill: AXIS, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[50, 100]}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(215, 20%, 10%)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.3)" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="efficiency"
                  stroke={SLEEP_COLOR}
                  strokeWidth={1.5}
                  dot={{ r: 2.5, fill: SLEEP_COLOR, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: SLEEP_COLOR, strokeWidth: 0 }}
                  connectNulls
                  name="Efficiency"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartSection>

          {/* ── Feeling Chart ── */}
          <ChartSection title="Feeling" testId="chart-feel">
            <ResponsiveContainer width="100%" height={140}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
              >
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: AXIS, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={period === "month" ? 6 : 0}
                />
                <YAxis
                  tick={{ fill: AXIS, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(215, 20%, 10%)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.3)" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="feeling"
                  stroke={REFLECTION_COLOR}
                  strokeWidth={1}
                  dot={{ r: 2.5, fill: REFLECTION_COLOR, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: REFLECTION_COLOR, strokeWidth: 0 }}
                  connectNulls
                  name="Feeling"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartSection>

          {/* ── Correlations ── */}
          {correlations && (correlations.drinks || correlations.weed) && (
            <div className="mt-2">
              <div className="text-[10px] text-zone-substance-muted uppercase tracking-[0.2em] font-medium mb-6">
                Correlations
              </div>

              {correlations.drinks && (
                <CorrelationBlock
                  title="Alcohol"
                  withLabel="With drinks"
                  withData={correlations.drinks.with}
                  withoutLabel="No drinks"
                  withoutData={correlations.drinks.without}
                />
              )}

              {correlations.weed && (
                <CorrelationBlock
                  title="Spliffs"
                  withLabel="With spliffs"
                  withData={correlations.weed.with}
                  withoutLabel="Without"
                  withoutData={correlations.weed.without}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ChartSection({
  title,
  testId,
  children,
}: {
  title: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-10" data-testid={testId}>
      <div className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium mb-4">
        {title}
      </div>
      {children}
    </div>
  );
}

function CorrelationBlock({
  title,
  withLabel,
  withData,
  withoutLabel,
  withoutData,
}: {
  title: string;
  withLabel: string;
  withData: { sleep: number; eff: number; feel: number; count: number };
  withoutLabel: string;
  withoutData: { sleep: number; eff: number; feel: number; count: number };
}) {
  return (
    <div className="mb-8">
      <div className="text-sm text-foreground/80 mb-3">{title}</div>
      <div className="grid grid-cols-2 gap-3">
        <CorrelationCard
          label={withLabel}
          sleep={withData.sleep}
          eff={withData.eff}
          feel={withData.feel}
          count={withData.count}
        />
        <CorrelationCard
          label={withoutLabel}
          sleep={withoutData.sleep}
          eff={withoutData.eff}
          feel={withoutData.feel}
          count={withoutData.count}
        />
      </div>
    </div>
  );
}

function CorrelationCard({
  label,
  sleep,
  eff,
  feel,
  count,
}: {
  label: string;
  sleep: number;
  eff: number;
  feel: number;
  count: number;
}) {
  return (
    <div className="p-3 rounded-md bg-zone-substance-bg/40 border border-zone-substance/8">
      <div className="text-xs text-zone-substance-muted/70 mb-2.5">
        {label}{" "}
        <span className="text-zone-substance-muted/30">({count}n)</span>
      </div>
      <div className="space-y-1.5">
        <CorrelationRow label="Sleep" value={formatDuration(sleep)} />
        <CorrelationRow label="Eff" value={formatEfficiency(eff)} />
        <CorrelationRow label="Feel" value={feel.toFixed(1)} />
      </div>
    </div>
  );
}

function CorrelationRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground/30">{label}</span>
      <span className="tabular-nums text-foreground/70">{value}</span>
    </div>
  );
}
