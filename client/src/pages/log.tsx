import { useState, useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import TimePicker from "@/components/time-picker";
import type { SleepEntry, NightWaking } from "@shared/schema";
import {
  getEntryByDate,
  saveEntry,
  deleteEntry,
  generateId,
  getAllEntries,
} from "@/lib/storage";
import {
  calculateMetrics,
  formatDuration,
  formatEfficiency,
  getYesterday,
  toDateString,
  parseDate,
  getCalendarDays,
  formatMonthYear,
} from "@/lib/sleepUtils";

interface LogPageProps {
  initialDate?: string;
}

export default function LogPage({ initialDate }: LogPageProps) {
  const [date, setDate] = useState(initialDate || getYesterday());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [bedtime, setBedtime] = useState("22:30");
  const [sleepTime, setSleepTime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [nightWakings, setNightWakings] = useState<NightWaking[]>([]);
  const [hasNap, setHasNap] = useState(false);
  const [napMinutes, setNapMinutes] = useState(30);
  const [napDisplay, setNapDisplay] = useState(30);
  const [drinks, setDrinks] = useState(0);
  const [weed, setWeed] = useState(false);
  const [insights, setInsights] = useState(false);
  const [feeling, setFeeling] = useState(3);
  const [notes, setNotes] = useState("");
  const [existingId, setExistingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [activePicker, setActivePicker] = useState<{
    field: string;
    value: string;
    label: string;
    onChange: (v: string) => void;
  } | null>(null);

  const selectedParsed = parseDate(date);
  const [calYear, setCalYear] = useState(selectedParsed.getFullYear());
  const [calMonth, setCalMonth] = useState(selectedParsed.getMonth());

  const todayStr = toDateString(new Date());

  const entryDatesSet = useMemo(() => {
    const entries = getAllEntries();
    return new Set(entries.map((e) => e.date));
  }, [date]);

  useEffect(() => {
    const entry = getEntryByDate(date);
    if (entry) {
      setBedtime(entry.bedtime);
      setSleepTime(entry.sleepTime);
      setWakeTime(entry.wakeTime);
      setNightWakings(entry.nightWakings);
      setHasNap(!!entry.napStart);
      if (entry.napStart && entry.napEnd) {
        const [sh, sm] = entry.napStart.split(":").map(Number);
        const [eh, em] = entry.napEnd.split(":").map(Number);
        const nm = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
        setNapMinutes(nm);
        setNapDisplay(nm);
      } else {
        setNapMinutes(30);
        setNapDisplay(30);
      }
      setDrinks(entry.drinks);
      setWeed(entry.weed);
      setInsights(entry.insights);
      setFeeling(entry.feeling);
      setNotes(entry.notes);
      setExistingId(entry.id);
    } else {
      setBedtime("22:30");
      setSleepTime("23:00");
      setWakeTime("07:00");
      setNightWakings([]);
      setHasNap(false);
      setNapMinutes(30);
      setNapDisplay(30);
      setDrinks(0);
      setWeed(false);
      setInsights(false);
      setFeeling(3);
      setNotes("");
      setExistingId(null);
    }
  }, [date]);

  useEffect(() => {
    const d = parseDate(date);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
  }, [date]);

  const napEndTime = useMemo(() => {
    const totalMin = 14 * 60 + napMinutes;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }, [napMinutes]);

  const metrics = useMemo(() => {
    return calculateMetrics({
      bedtime,
      sleepTime,
      wakeTime,
      nightWakings,
      napStart: hasNap ? "14:00" : null,
      napEnd: hasNap ? napEndTime : null,
    });
  }, [bedtime, sleepTime, wakeTime, nightWakings, hasNap, napEndTime]);

  const handleSave = () => {
    const entry: SleepEntry = {
      id: existingId || generateId(),
      date,
      bedtime,
      sleepTime,
      wakeTime,
      nightWakings,
      napStart: hasNap ? "14:00" : null,
      napEnd: hasNap ? napEndTime : null,
      drinks,
      weed,
      insights,
      feeling,
      notes,
      createdAt:
        existingId
          ? getEntryByDate(date)?.createdAt || new Date().toISOString()
          : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveEntry(entry);
    setExistingId(entry.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const handleDelete = () => {
    if (existingId) {
      deleteEntry(existingId);
      setExistingId(null);
      setBedtime("22:30");
      setSleepTime("23:00");
      setWakeTime("07:00");
      setNightWakings([]);
      setHasNap(false);
      setDrinks(0);
      setWeed(false);
      setInsights(false);
      setFeeling(3);
      setNotes("");
    }
  };

  const addNightWaking = () => {
    setNightWakings([
      ...nightWakings,
      { id: generateId(), start: "03:00", end: "03:30" },
    ]);
  };

  const removeNightWaking = (id: string) => {
    setNightWakings(nightWakings.filter((w) => w.id !== id));
  };

  const updateWaking = (
    id: string,
    field: "start" | "end",
    value: string
  ) => {
    setNightWakings(
      nightWakings.map((w) => (w.id === id ? { ...w, [field]: value } : w))
    );
  };

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

  const selectCalendarDate = (dateStr: string) => {
    if (dateStr > todayStr) return;
    setDate(dateStr);
    setCalendarOpen(false);
  };

  const displayDate = parseDate(date);
  const displayDateStr = displayDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-col min-h-full px-5 pb-24" style={{ paddingTop: "max(1.5rem, calc(env(safe-area-inset-top) + 0.75rem))" }}>
      {/* ── Date ── */}
      <div className="mb-6">
        <button
          onClick={() => setCalendarOpen(!calendarOpen)}
          className="w-full text-center py-2"
          data-testid="button-date-picker"
        >
          <div className="text-xl font-medium text-foreground tracking-tight">
            {displayDateStr}
          </div>
          {existingId && (
            <div className="text-[10px] text-zone-sleep-muted mt-0.5 uppercase tracking-[0.15em]">
              saved
            </div>
          )}
        </button>

        {calendarOpen && (
          <div className="mt-3 rounded-md border border-border/30 bg-zone-sleep-bg p-4" data-testid="calendar-picker">
            <div className="flex items-center justify-between mb-4">
              <Button size="icon" variant="ghost" onClick={prevMonth} data-testid="button-cal-prev">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-sm font-medium text-foreground" data-testid="text-cal-month">
                {formatMonthYear(calYear, calMonth)}
              </span>
              <Button size="icon" variant="ghost" onClick={nextMonth} data-testid="button-cal-next">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-0">
              {dayHeaders.map((d) => (
                <div key={d} className="text-center text-[10px] text-zone-disruption-muted pb-2 font-medium uppercase">
                  {d}
                </div>
              ))}
              {calendarDays.map((cd, i) => {
                const isSelected = cd.date === date;
                const isFutureDay = cd.date > todayStr;
                const isCurrentMonth = cd.inMonth;
                const hasEntry = entryDatesSet.has(cd.date);
                const isToday = cd.date === todayStr;

                return (
                  <button
                    key={i}
                    onClick={() => selectCalendarDate(cd.date)}
                    disabled={isFutureDay}
                    className={cn(
                      "relative flex flex-col items-center justify-center py-2 text-sm transition-colors",
                      !isCurrentMonth && "opacity-20",
                      isFutureDay && "opacity-10 cursor-not-allowed",
                      isSelected && "bg-zone-sleep/15 rounded-md text-zone-sleep font-medium",
                      !isSelected && isCurrentMonth && !isFutureDay && "text-foreground/80",
                      isToday && !isSelected && "text-zone-sleep"
                    )}
                    data-testid={`cal-day-${cd.date}`}
                  >
                    <span>{cd.day}</span>
                    {hasEntry && !isSelected && (
                      <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-zone-sleep/50" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── The Night (Sleep Zone) ── */}
      <div className="mb-2 rounded-md bg-zone-sleep-bg/60 px-4 -mx-1">
        <ZoneLabel color="sleep">The Night</ZoneLabel>
        <TimeRow
          label="Bedtime"
          value={bedtime}
          onTap={() => setActivePicker({ field: "bedtime", value: bedtime, label: "Bedtime", onChange: setBedtime })}
          testId="input-bedtime"
          zone="sleep"
        />
        <TimeRow
          label="Fell asleep"
          value={sleepTime}
          onTap={() => setActivePicker({ field: "sleepTime", value: sleepTime, label: "Fell asleep", onChange: setSleepTime })}
          testId="input-sleep-time"
          zone="sleep"
        />
        <TimeRow
          label="Woke up"
          value={wakeTime}
          onTap={() => setActivePicker({ field: "wakeTime", value: wakeTime, label: "Woke up", onChange: setWakeTime })}
          testId="input-wake-time"
          zone="sleep"
          noBorder
        />
      </div>

      {/* ── Disruptions (Disruption Zone) ── */}
      <div className="mt-6 mb-2">
        <div className="flex items-center justify-between">
          <ZoneLabel color="disruption" className="mb-0">Disruptions</ZoneLabel>
          <Button
            size="icon"
            variant="ghost"
            onClick={addNightWaking}
            data-testid="button-add-waking"
          >
            <Plus className="w-4 h-4 text-zone-disruption-muted" />
          </Button>
        </div>

        {nightWakings.length === 0 && (
          <div className="text-sm text-zone-disruption-muted/50 py-2">None</div>
        )}

        {nightWakings.map((w) => (
          <div
            key={w.id}
            className="flex items-center gap-3 py-3 border-b border-zone-disruption/10"
          >
            <button
              onClick={() => setActivePicker({ field: `waking-start-${w.id}`, value: w.start, label: "Waking start", onChange: (v) => updateWaking(w.id, "start", v) })}
              className="bg-transparent text-lg font-light text-foreground/80 tabular-nums"
              data-testid={`input-waking-start-${w.id}`}
            >
              {w.start}
            </button>
            <span className="text-zone-disruption-muted/40 text-sm">—</span>
            <button
              onClick={() => setActivePicker({ field: `waking-end-${w.id}`, value: w.end, label: "Waking end", onChange: (v) => updateWaking(w.id, "end", v) })}
              className="bg-transparent text-lg font-light text-foreground/80 tabular-nums"
              data-testid={`input-waking-end-${w.id}`}
            >
              {w.end}
            </button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeNightWaking(w.id)}
              className="ml-auto"
              data-testid={`button-remove-waking-${w.id}`}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* ── Nap (Disruption Zone) ── */}
      <div className="mb-2 mt-4">
        <div className="flex items-center justify-between">
          <ZoneLabel color="disruption" className="mb-0">Nap</ZoneLabel>
          {!hasNap && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setHasNap(true)}
              data-testid="button-add-nap"
            >
              <Plus className="w-4 h-4 text-zone-disruption-muted" />
            </Button>
          )}
        </div>

        {!hasNap && (
          <div className="text-sm text-zone-disruption-muted/50 py-2">None</div>
        )}

        {hasNap && (
          <div className="py-3 border-b border-zone-disruption/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-light text-foreground/80 tabular-nums" data-testid="text-nap-duration">
                {formatDuration(napDisplay)}
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setHasNap(false)}
                data-testid="button-remove-nap"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <NapSlider value={napMinutes} onChange={(v) => { setNapMinutes(v); setNapDisplay(v); }} onDisplayChange={setNapDisplay} />
          </div>
        )}
      </div>

      {/* ── Metrics Strip (Hero) ── */}
      <div className="mt-8 mb-8">
        <div className="flex items-baseline justify-center gap-6">
          <div className="text-center">
            <div
              className="text-4xl font-light tabular-nums text-foreground tracking-tight"
              data-testid="metric-asleep"
            >
              {formatDuration(metrics.totalSleep)}
            </div>
            <div className="text-[10px] text-muted-foreground/40 mt-1 uppercase tracking-[0.2em]">
              Asleep
            </div>
          </div>
          <div className="w-px h-8 bg-border/20" />
          <div className="text-center">
            <div
              className="text-2xl font-light tabular-nums text-zone-sleep"
              data-testid="metric-efficiency"
            >
              {formatEfficiency(metrics.sleepEfficiency)}
            </div>
            <div className="text-[10px] text-muted-foreground/40 mt-1 uppercase tracking-[0.2em]">
              Efficiency
            </div>
          </div>
          <div className="w-px h-8 bg-border/20" />
          <div className="text-center">
            <div
              className="text-2xl font-light tabular-nums text-foreground/60"
              data-testid="metric-in-bed"
            >
              {formatDuration(metrics.timeInBed)}
            </div>
            <div className="text-[10px] text-muted-foreground/40 mt-1 uppercase tracking-[0.2em]">
              In bed
            </div>
          </div>
        </div>
        {metrics.napDuration > 0 && (
          <div className="mt-3 text-center">
            <span className="text-xs text-zone-disruption-muted/60">
              +{formatDuration(metrics.napDuration)} nap · {formatDuration(metrics.adjustedTotal)} total
            </span>
          </div>
        )}
      </div>

      {/* ── Factors (Substance Zone) ── */}
      <div className="mb-8 rounded-md bg-zone-substance-bg/60 px-4 py-3 -mx-1">
        <ZoneLabel color="substance">Factors</ZoneLabel>

        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-foreground/70">Drinks</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrinks(Math.max(0, drinks - 1))}
              disabled={drinks === 0}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-base font-light transition-colors",
                drinks === 0 ? "text-muted-foreground/20" : "text-zone-substance active:bg-zone-substance/15"
              )}
              data-testid="button-drinks-minus"
            >
              −
            </button>
            <span
              className="text-xl font-light tabular-nums w-5 text-center text-foreground"
              data-testid="text-drinks-count"
            >
              {drinks}
            </span>
            <button
              onClick={() => setDrinks(Math.min(15, drinks + 1))}
              className="w-8 h-8 rounded-full flex items-center justify-center text-base font-light text-zone-substance active:bg-zone-substance/15 transition-colors"
              data-testid="button-drinks-plus"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-zone-substance/8">
          <span className="text-sm text-foreground/70">Spliffs</span>
          <Switch
            checked={weed}
            onCheckedChange={setWeed}
            data-testid="switch-weed"
          />
        </div>

        <div className="flex items-center justify-between py-2 border-t border-zone-substance/8">
          <span className="text-sm text-foreground/70">Other</span>
          <Switch
            checked={insights}
            onCheckedChange={setInsights}
            data-testid="switch-insights"
          />
        </div>
      </div>

      {/* ── How I Feel (Reflection Zone) ── */}
      <div className="mb-6">
        <ZoneLabel color="reflection">How I feel</ZoneLabel>
        <div className="flex gap-1 justify-center">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setFeeling(n)}
              className="p-2 transition-colors"
              data-testid={`button-feeling-${n}`}
            >
              <Star
                className={cn(
                  "w-8 h-8 transition-colors",
                  n <= feeling
                    ? "fill-zone-reflection text-zone-reflection"
                    : "fill-none text-zone-reflection-muted/30"
                )}
              />
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-zone-reflection-muted/50 mt-2 px-2 uppercase tracking-wider">
          <span>Terrible</span>
          <span>Great</span>
        </div>
      </div>

      {/* ── Notes (Reflection Zone) ── */}
      <div className="mb-8">
        <ZoneLabel color="reflection">Notes</ZoneLabel>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any observations..."
          className="resize-none border-zone-reflection/10 bg-zone-reflection-bg/30 text-sm min-h-[72px] placeholder:text-zone-reflection-muted/30"
          data-testid="input-notes"
        />
      </div>

      {/* ── Save ── */}
      <div className="flex gap-3">
        {existingId && (
          <Button
            variant="ghost"
            onClick={handleDelete}
            data-testid="button-delete-entry"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        )}
        <Button
          onClick={handleSave}
          className={cn(
            "flex-1 text-base transition-all duration-300",
            saved && "bg-emerald-600 hover:bg-emerald-600"
          )}
          data-testid="button-save-entry"
        >
          {saved ? (
            <Check className="w-5 h-5" />
          ) : (
            existingId ? "Update" : "Save"
          )}
        </Button>
      </div>

      {activePicker && (
        <TimePicker
          value={activePicker.value}
          label={activePicker.label}
          onChange={(v) => {
            activePicker.onChange(v);
            setActivePicker(null);
          }}
          onClose={() => setActivePicker(null)}
        />
      )}
    </div>
  );
}

function ZoneLabel({
  children,
  color,
  className,
}: {
  children: string;
  color: "sleep" | "disruption" | "substance" | "reflection";
  className?: string;
}) {
  const colorMap = {
    sleep: "text-zone-sleep-muted",
    disruption: "text-zone-disruption-muted",
    substance: "text-zone-substance-muted",
    reflection: "text-zone-reflection-muted",
  };

  return (
    <div
      className={cn(
        "text-[10px] uppercase tracking-[0.2em] font-medium mb-3 pt-1",
        colorMap[color],
        className
      )}
    >
      {children}
    </div>
  );
}

function napSliderToMinutes(pos: number): number {
  if (pos <= 0) return 0;
  let raw: number;
  if (pos <= 0.5) {
    raw = 45 * Math.pow(pos / 0.5, 1.5);
  } else {
    const t = (pos - 0.5) / 0.5;
    raw = 45 + 135 * Math.pow(t, 1.8);
  }
  if (raw <= 60) {
    return Math.round(raw / 5) * 5;
  }
  return Math.round(raw / 15) * 15;
}

function napMinutesToSlider(min: number): number {
  if (min <= 0) return 0;
  if (min <= 45) {
    return 0.5 * Math.pow(min / 45, 1 / 1.5);
  }
  const t = Math.pow((min - 45) / 135, 1 / 1.8);
  return 0.5 + 0.5 * t;
}

function napSliderToRaw(pos: number): number {
  if (pos <= 0) return 0;
  if (pos <= 0.5) {
    return 45 * Math.pow(pos / 0.5, 1.5);
  }
  const t = (pos - 0.5) / 0.5;
  return 45 + 135 * Math.pow(t, 1.8);
}

function napRawToSlider(min: number): number {
  if (min <= 0) return 0;
  if (min <= 45) {
    return 0.5 * Math.pow(min / 45, 1 / 1.5);
  }
  const t = Math.pow((min - 45) / 135, 1 / 1.8);
  return 0.5 + 0.5 * t;
}

function snapMinutes(raw: number): number {
  if (raw <= 0) return 0;
  if (raw <= 60) return Math.round(raw / 5) * 5;
  return Math.round(raw / 15) * 15;
}

function NapSlider({ value, onChange, onDisplayChange }: { value: number; onChange: (v: number) => void; onDisplayChange?: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rawValue, setRawValue] = useState(value);

  const pct = (dragging ? napRawToSlider(rawValue) : napMinutesToSlider(value)) * 100;

  const posToRaw = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return rawValue;
    const rect = track.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return napSliderToRaw(pos);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const raw = posToRaw(e.touches[0].clientX);
    setDragging(true);
    setRawValue(raw);
    onDisplayChange?.(Math.round(raw));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const raw = posToRaw(e.touches[0].clientX);
    setRawValue(raw);
    onDisplayChange?.(Math.round(raw));
  };

  const handleTouchEnd = () => {
    setDragging(false);
    const snapped = snapMinutes(rawValue);
    onChange(snapped);
    onDisplayChange?.(snapped);
  };

  const handleClick = (e: React.MouseEvent) => {
    const raw = posToRaw(e.clientX);
    onChange(snapMinutes(raw));
  };

  const ticks = [
    { min: 0, label: "0" },
    { min: 15, label: "15m" },
    { min: 30, label: "30m" },
    { min: 45, label: "45m" },
    { min: 60, label: "1h" },
    { min: 120, label: "2h" },
    { min: 180, label: "3h" },
  ];

  return (
    <div className="pt-2 pb-1" data-testid="slider-nap">
      <div
        ref={trackRef}
        className="relative h-10 flex items-center cursor-pointer select-none touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        data-testid="input-nap-slider"
      >
        <div className="absolute left-0 right-0 h-1 rounded-full bg-white/[0.06]" />
        <div
          className="absolute left-0 h-1 rounded-full"
          style={{
            width: `${pct}%`,
            background: "var(--zone-disruption)",
            transition: dragging ? "none" : "width 0.15s ease-out",
          }}
        />
        <div
          className="absolute w-5 h-5 rounded-full -translate-x-1/2"
          style={{
            left: `${pct}%`,
            background: "var(--zone-disruption)",
            boxShadow: "0 0 0 2px rgba(255,255,255,0.2)",
            transition: dragging ? "none" : "left 0.15s ease-out",
          }}
        />
      </div>
      <div className="relative h-4 mx-0">
        {ticks.map((t) => {
          const tickPct = napMinutesToSlider(t.min) * 100;
          return (
            <span
              key={t.min}
              className="absolute text-[9px] text-zone-disruption-muted/40 tabular-nums -translate-x-1/2"
              style={{ left: `${tickPct}%` }}
            >
              {t.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function TimeRow({
  label,
  value,
  onTap,
  testId,
  noBorder,
  zone,
}: {
  label: string;
  value: string;
  onTap: () => void;
  testId: string;
  noBorder?: boolean;
  zone?: "sleep" | "disruption";
}) {
  return (
    <button
      onClick={onTap}
      className={cn(
        "flex items-center justify-between py-3 w-full text-left",
        !noBorder && (zone === "sleep" ? "border-b border-zone-sleep/8" : "border-b border-border/10")
      )}
      data-testid={testId}
    >
      <span className="text-sm text-foreground/50">{label}</span>
      <span className="text-2xl font-light text-foreground tabular-nums">{value}</span>
    </button>
  );
}
