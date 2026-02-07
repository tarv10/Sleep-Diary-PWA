import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

const AMBER = "hsl(28, 55%, 48%)";
const SLATE = "hsl(200, 40%, 50%)";
const GRID = "rgba(255, 255, 255, 0.04)";
const AXIS = "rgba(255, 255, 255, 0.25)";

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
        };
      const m = calculateMetrics(entry);
      return {
        date: formatShortDate(d),
        sleepHours: Math.round((m.totalSleep / 60) * 10) / 10,
        efficiency: Math.round(m.sleepEfficiency),
        feeling: entry.feeling,
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
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <h1 className="text-2xl font-medium">Stats</h1>
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

      {averages && (
        <div className="grid grid-cols-3 gap-4 mb-10">
          <Stat
            label="Avg sleep"
            value={formatDuration(averages.avgSleep)}
            testId="text-avg-sleep"
          />
          <Stat
            label="Avg efficiency"
            value={formatEfficiency(averages.avgEff)}
            accent
            testId="text-avg-eff"
          />
          <Stat
            label="Avg feeling"
            value={averages.avgFeel.toFixed(1)}
            testId="text-avg-feel"
          />
        </div>
      )}

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
            <div key={d} className="text-center text-xs text-muted-foreground/40 pb-2 font-medium">
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
                  !isCurrentMonth && "opacity-25",
                  isFutureDay && "opacity-15",
                  isCurrentMonth && !isFutureDay && "text-foreground"
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
            <span className="text-xs text-muted-foreground/60">Good</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs text-muted-foreground/60">OK</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground/60">Poor</span>
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-muted-foreground/40 py-20">
          <div className="text-base">No entries for this period</div>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          <ChartSection title="Sleep duration" testId="chart-sleep">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
              >
                <CartesianGrid
                  stroke={GRID}
                  strokeDasharray="3 3"
                  vertical={false}
                />
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
                    background: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.4)" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="sleepHours"
                  stroke={AMBER}
                  strokeWidth={1.5}
                  dot={{ r: 2.5, fill: AMBER, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: AMBER, strokeWidth: 0 }}
                  connectNulls
                  name="Hours"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartSection>

          <ChartSection title="Sleep efficiency" testId="chart-eff">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
              >
                <CartesianGrid
                  stroke={GRID}
                  strokeDasharray="3 3"
                  vertical={false}
                />
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
                    background: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.4)" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="efficiency"
                  stroke={SLATE}
                  strokeWidth={1.5}
                  dot={{ r: 2.5, fill: SLATE, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: SLATE, strokeWidth: 0 }}
                  connectNulls
                  name="Efficiency"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartSection>

          <ChartSection title="Feeling" testId="chart-feel">
            <ResponsiveContainer width="100%" height={140}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
              >
                <CartesianGrid
                  stroke={GRID}
                  strokeDasharray="3 3"
                  vertical={false}
                />
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
                    background: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.4)" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="feeling"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth={1}
                  dot={{ r: 2.5, fill: "rgba(255,255,255,0.5)", strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: "rgba(255,255,255,0.7)", strokeWidth: 0 }}
                  connectNulls
                  name="Feeling"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartSection>

          {correlations && (correlations.drinks || correlations.weed) && (
            <div className="mt-2">
              <div className="text-xs text-muted-foreground/50 uppercase tracking-[0.2em] font-medium mb-6">
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

function Stat({
  label,
  value,
  accent,
  testId,
}: {
  label: string;
  value: string;
  accent?: boolean;
  testId: string;
}) {
  return (
    <div className="text-center">
      <div
        className={`text-3xl font-light tabular-nums ${accent ? "text-primary" : "text-foreground"}`}
        data-testid={testId}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground/50 mt-1 uppercase tracking-[0.15em]">
        {label}
      </div>
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
      <div className="text-xs text-muted-foreground/50 uppercase tracking-[0.2em] font-medium mb-4">
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
      <div className="text-base text-foreground mb-3">{title}</div>
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
    <div className="p-3 rounded-md bg-card/40 border border-border/10">
      <div className="text-sm text-muted-foreground mb-2.5">
        {label}{" "}
        <span className="text-muted-foreground/30">({count}n)</span>
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
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground/40">{label}</span>
      <span className="tabular-nums text-foreground/80">{value}</span>
    </div>
  );
}
