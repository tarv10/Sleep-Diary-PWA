import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Star, Check, Moon, Sun, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import TimePicker, { InlineTimePicker } from "@/components/time-picker";
import type { SleepEntry, NightWaking, NapEntry, FactorDefinition } from "@shared/schema";
import {
  getEntryByDate,
  saveEntry,
  deleteEntry,
  generateId,
  getAllEntries,
  getSettings,
  getFactorValue,
} from "@/lib/storage";
import { useLocation } from "wouter";
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

function FadeValue({ value, className, testId }: { value: string; className?: string; testId?: string }) {
  const [display, setDisplay] = useState(value);
  const [visible, setVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const latestValue = useRef(value);
  latestValue.current = value;

  useEffect(() => {
    if (value === display) return;
    setVisible(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setDisplay(latestValue.current);
      requestAnimationFrame(() => setVisible(true));
    }, 130);
  }, [value]);

  return (
    <div
      className={cn(className)}
      style={{
        opacity: visible ? 1 : 0,
        transition: visible ? "opacity 150ms ease-in" : "opacity 100ms ease-out",
      }}
      data-testid={testId}
    >
      {display}
    </div>
  );
}

interface LogPageProps {
  initialDate?: string;
}

export default function LogPage({ initialDate }: LogPageProps) {
  const defaults = getSettings();
  const [, navigate] = useLocation();
  const [date, setDate] = useState(initialDate || getYesterday());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [bedtime, setBedtime] = useState(defaults.defaultBedtime);
  const [sleepTime, setSleepTime] = useState(defaults.defaultSleepTime);
  const [wakeTime, setWakeTime] = useState(defaults.defaultWakeTime);
  const [nightWakings, setNightWakings] = useState<NightWaking[]>([]);
  const [naps, setNaps] = useState<NapEntry[]>([]);
  const factorDefs = defaults.factors;
  const initFV: Record<string, number | boolean> = {};
  factorDefs.forEach((f) => {
    initFV[f.id] = f.type === "integer" ? 0 : false;
  });
  const [factorValues, setFactorValues] = useState<Record<string, number | boolean>>(initFV);
  const [feeling, setFeeling] = useState(3);
  const [notes, setNotes] = useState("");
  const [existingId, setExistingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const manualEndIds = useRef<Set<string>>(new Set());
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
      manualEndIds.current = new Set(entry.nightWakings.map((w) => w.id));
      if (entry.naps && entry.naps.length > 0) {
        setNaps(entry.naps);
      } else if (entry.napStart && entry.napEnd) {
        const [sh, sm] = entry.napStart.split(":").map(Number);
        const [eh, em] = entry.napEnd.split(":").map(Number);
        const mins = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
        if (mins > 0) {
          setNaps([{ id: generateId(), minutes: mins }]);
        } else {
          setNaps([]);
        }
      } else {
        setNaps([]);
      }
      const loadedFV: Record<string, number | boolean> = {};
      factorDefs.forEach((f) => {
        loadedFV[f.id] = getFactorValue(entry, f.id);
      });
      setFactorValues(loadedFV);
      setFeeling(entry.feeling);
      setNotes(entry.notes);
      setExistingId(entry.id);
    } else {
      const s = getSettings();
      setBedtime(s.defaultBedtime);
      setSleepTime(s.defaultSleepTime);
      setWakeTime(s.defaultWakeTime);
      manualEndIds.current.clear();
      setNightWakings([]);
      setNaps([]);
      const resetFV: Record<string, number | boolean> = {};
      factorDefs.forEach((f) => {
        resetFV[f.id] = f.type === "integer" ? 0 : false;
      });
      setFactorValues(resetFV);
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

  const metrics = useMemo(() => {
    return calculateMetrics({
      bedtime,
      sleepTime,
      wakeTime,
      nightWakings,
      napStart: null,
      napEnd: null,
      naps: naps.filter(n => n.minutes > 0),
    });
  }, [bedtime, sleepTime, wakeTime, nightWakings, naps]);

  const handleSave = () => {
    const entry: SleepEntry = {
      id: existingId || generateId(),
      date,
      bedtime,
      sleepTime,
      wakeTime,
      nightWakings,
      napStart: null,
      napEnd: null,
      naps: naps.filter(n => n.minutes > 0),
      drinks: typeof factorValues["alc_drinks"] === "number" ? (factorValues["alc_drinks"] as number) : 0,
      weed: false,
      insights: false,
      factorValues,
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
      const s = getSettings();
      setExistingId(null);
      setBedtime(s.defaultBedtime);
      setSleepTime(s.defaultSleepTime);
      setWakeTime(s.defaultWakeTime);
      setNightWakings([]);
      setNaps([]);
      const resetFV: Record<string, number | boolean> = {};
      factorDefs.forEach((f) => {
        resetFV[f.id] = f.type === "integer" ? 0 : false;
      });
      setFactorValues(resetFV);
      setFeeling(3);
      setNotes("");
    }
  };

  const addNightWaking = () => {
    const newId = generateId();
    setNightWakings([
      ...nightWakings,
      { id: newId, start: "03:00", end: "03:15" },
    ]);
  };

  const removeNightWaking = (id: string) => {
    manualEndIds.current.delete(id);
    setNightWakings(nightWakings.filter((w) => w.id !== id));
  };

  const addMinutesToTime = (time: string, minutes: number): string => {
    const [h, m] = time.split(":").map(Number);
    const total = (h * 60 + m + minutes) % 1440;
    return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
  };

  const updateWaking = (
    id: string,
    field: "start" | "end",
    value: string
  ) => {
    if (field === "end") {
      manualEndIds.current.add(id);
    }
    setNightWakings((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (field === "start" && !manualEndIds.current.has(id)) {
          return { ...w, start: value, end: addMinutesToTime(value, 15) };
        }
        return { ...w, [field]: value };
      })
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
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const prevDay = new Date(displayDate);
  prevDay.setDate(prevDay.getDate() - 1);
  const prevDayName = prevDay.toLocaleDateString("en-US", { weekday: "long" });

  return (
    <div className="flex flex-col min-h-full px-5 pb-24" style={{ paddingTop: "max(1.5rem, calc(env(safe-area-inset-top) + 0.75rem))" }}>
      {/* ── Date ── */}
      <div className="mb-6">
        <button
          onClick={() => setCalendarOpen(!calendarOpen)}
          className="w-full text-center py-2"
          data-testid="button-date-picker"
        >
          <div className="text-xl font-medium text-foreground tracking-tight inline-flex items-center gap-2">
            <span className="border-b border-dashed border-foreground/25 pb-0.5">{displayDateStr}</span>
            {existingId && <Save className="w-3.5 h-3.5 text-zone-sleep-muted" strokeWidth={1.5} />}
          </div>
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
      <div className="mb-2 px-3 pb-3 pt-4 -mx-1">
        <div className="relative flex items-start">
          <div className="flex flex-col items-center flex-1" data-testid="input-bedtime">
            <svg className="w-4 h-4 mb-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ color: "hsl(120, 35%, 48%)" }}>
              <path d="M12 1C9 6 7 9 7 14c0 2 1.2 3.8 3 4.8C11.5 19.5 13 18 14 16c-.5 2 .5 4 2 5.2C17.5 19.5 19 17 19 14c0-3-1.5-5.5-3-8C14.5 4 13 2.5 12 1z" />
            </svg>
            <span className="text-[10px] uppercase tracking-[0.15em] mb-1" style={{ color: "hsl(120, 35%, 48%)" }}>In bed</span>
            <InlineTimePicker value={bedtime} onChange={setBedtime} fadeBg="#0f1219" testId="input-bedtime-picker" color="hsl(120, 35%, 48%)" />
          </div>
          <div className="flex-shrink-0 pointer-events-none" style={{ width: 20, paddingTop: 93 }}>
            <div style={{ height: 1, opacity: 0.25, background: "linear-gradient(to right, hsl(120, 35%, 48%), hsl(200, 75%, 60%))" }} />
          </div>
          <div className="flex flex-col items-center flex-1" data-testid="input-sleep-time">
            <Moon className="w-4 h-4 mb-1.5" strokeWidth={1.5} style={{ color: "hsl(200, 75%, 60%)" }} />
            <span className="text-[10px] uppercase tracking-[0.15em] mb-1" style={{ color: "hsl(200, 75%, 60%)" }}>~ Asleep ~</span>
            <InlineTimePicker value={sleepTime} onChange={setSleepTime} fadeBg="#0f1219" testId="input-sleep-time-picker" color="hsl(200, 75%, 60%)" colorMix={70} />
          </div>
          <div className="flex-shrink-0 pointer-events-none" style={{ width: 20, paddingTop: 93 }}>
            <div style={{ height: 1, opacity: 0.25, background: "linear-gradient(to right, hsl(200, 75%, 60%), hsl(45, 70%, 55%))" }} />
          </div>
          <div className="flex flex-col items-center flex-1" data-testid="input-wake-time">
            <Sun className="w-4 h-4 mb-1.5" strokeWidth={1.5} style={{ color: "hsl(45, 70%, 55%)" }} />
            <span className="text-[10px] uppercase tracking-[0.15em] mb-1" style={{ color: "hsl(45, 70%, 55%)" }}>Awake</span>
            <InlineTimePicker value={wakeTime} onChange={setWakeTime} fadeBg="#0f1219" testId="input-wake-time-picker" color="hsl(45, 70%, 55%)" colorMix={55} />
          </div>
        </div>
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
          <ZoneLabel color="disruption" className="mb-0">Naps on {prevDayName}</ZoneLabel>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setNaps(prev => [...prev, { id: generateId(), minutes: 30 }])}
            data-testid="button-add-nap"
          >
            <Plus className="w-4 h-4 text-zone-disruption-muted" />
          </Button>
        </div>

        {naps.length === 0 && (
          <div className="text-sm text-zone-disruption-muted/50 py-2">None</div>
        )}

        {naps.map((nap) => (
          <div key={nap.id} className="py-2 border-b border-zone-disruption/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xl font-light text-foreground/80 tabular-nums" data-testid={`text-nap-duration-${nap.id}`}>
                {formatDuration(nap.minutes)}
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setNaps(prev => prev.filter(n => n.id !== nap.id))}
                data-testid={`button-remove-nap-${nap.id}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <NapSlider value={nap.minutes} onChange={(v) => setNaps(prev => prev.map(n => n.id === nap.id ? { ...n, minutes: v } : n))} />
          </div>
        ))}
      </div>

      {/* ── Metrics Strip ── */}
      <div className="mt-8 mb-8">
        <div className="flex items-baseline justify-center gap-6">
          <div className="text-center">
            <FadeValue
              value={formatDuration(metrics.totalSleep)}
              className="text-sm font-light tabular-nums text-foreground/70"
              testId="metric-asleep"
            />
            <div className="text-[10px] text-muted-foreground/40 mt-1 uppercase tracking-[0.2em]">
              Asleep
            </div>
          </div>
          <div className="w-px h-4 bg-border/20" />
          <div className="text-center">
            <FadeValue
              value={formatEfficiency(metrics.sleepEfficiency)}
              className="text-sm font-light tabular-nums text-foreground/70"
              testId="metric-efficiency"
            />
            <div className="text-[10px] text-muted-foreground/40 mt-1 uppercase tracking-[0.2em]">
              Efficiency
            </div>
          </div>
          <div className="w-px h-4 bg-border/20" />
          <div className="text-center">
            <FadeValue
              value={formatDuration(metrics.timeInBed)}
              className="text-sm font-light tabular-nums text-foreground/70"
              testId="metric-in-bed"
            />
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

        {factorDefs.map((factor, idx) => (
          <div
            key={factor.id}
            className={cn(
              "flex items-center justify-between py-2",
              idx > 0 && "border-t border-zone-substance/8"
            )}
          >
            <span className="text-sm text-foreground/70">{factor.label}</span>
            {factor.type === "integer" ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const cur = (factorValues[factor.id] as number) || 0;
                    setFactorValues({ ...factorValues, [factor.id]: Math.max(0, cur - 1) });
                  }}
                  disabled={((factorValues[factor.id] as number) || 0) === 0}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-base font-light transition-colors",
                    ((factorValues[factor.id] as number) || 0) === 0
                      ? "text-muted-foreground/20"
                      : "text-zone-substance active:bg-zone-substance/15"
                  )}
                  data-testid={`button-${factor.id}-minus`}
                >
                  −
                </button>
                <span
                  className="text-xl font-light tabular-nums w-5 text-center text-foreground"
                  data-testid={`text-${factor.id}-count`}
                >
                  {(factorValues[factor.id] as number) || 0}
                </span>
                <button
                  onClick={() => {
                    const cur = (factorValues[factor.id] as number) || 0;
                    const max = factor.max || 99;
                    setFactorValues({ ...factorValues, [factor.id]: Math.min(max, cur + 1) });
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-base font-light text-zone-substance active:bg-zone-substance/15 transition-colors"
                  data-testid={`button-${factor.id}-plus`}
                >
                  +
                </button>
              </div>
            ) : (
              <Switch
                checked={!!factorValues[factor.id]}
                onCheckedChange={(checked) => {
                  setFactorValues({ ...factorValues, [factor.id]: checked });
                }}
                data-testid={`switch-${factor.id}`}
              />
            )}
          </div>
        ))}

        <button
          onClick={() => navigate("/settings")}
          className="w-full text-center pt-2 mt-1 border-t border-zone-substance/8"
          data-testid="button-edit-factors"
        >
          <span className="text-[10px] text-zone-substance-muted/50 uppercase tracking-[0.15em]">
            edit factors
          </span>
        </button>
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
  children: React.ReactNode;
  color: "sleep" | "disruption" | "substance" | "reflection";
  className?: string;
}) {
  const colorMap = {
    sleep: "text-foreground",
    disruption: "text-foreground",
    substance: "text-foreground",
    reflection: "text-foreground",
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

function NapSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const pct = napMinutesToSlider(value) * 100;

  const posToSnapped = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return value;
    const rect = track.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return snapMinutes(napSliderToRaw(pos));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setDragging(true);
    onChange(posToSnapped(e.touches[0].clientX));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    onChange(posToSnapped(e.touches[0].clientX));
  };

  const handleTouchEnd = () => {
    setDragging(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    onChange(posToSnapped(e.clientX));
  };

  const ticks = [
    { min: 0, label: "0" },
    { min: 5, label: "5m" },
    { min: 15, label: "15m" },
    { min: 30, label: "30m" },
    { min: 45, label: "45m" },
    { min: 60, label: "1h" },
    { min: 90, label: "1.5h" },
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
            background: "#e2e8f0",
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

function InlineTimeRow({
  label,
  value,
  onChange,
  testId,
  noBorder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testId: string;
  noBorder?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        !noBorder && "border-b border-zone-sleep/8"
      )}
      data-testid={testId}
    >
      <span className="text-sm text-foreground/50">{label}</span>
      <InlineTimePicker value={value} onChange={onChange} fadeBg="#0f1219" testId={`${testId}-picker`} />
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
