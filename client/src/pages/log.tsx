import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
  const { toast } = useToast();
  const [date, setDate] = useState(initialDate || getYesterday());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [bedtime, setBedtime] = useState("22:30");
  const [sleepTime, setSleepTime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [nightWakings, setNightWakings] = useState<NightWaking[]>([]);
  const [hasNap, setHasNap] = useState(false);
  const [napStart, setNapStart] = useState("14:00");
  const [napEnd, setNapEnd] = useState("14:30");
  const [drinks, setDrinks] = useState(0);
  const [weed, setWeed] = useState(false);
  const [insights, setInsights] = useState(false);
  const [feeling, setFeeling] = useState(3);
  const [notes, setNotes] = useState("");
  const [existingId, setExistingId] = useState<string | null>(null);

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
      setNapStart(entry.napStart || "14:00");
      setNapEnd(entry.napEnd || "14:30");
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
      setNapStart("14:00");
      setNapEnd("14:30");
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

  const metrics = useMemo(() => {
    return calculateMetrics({
      bedtime,
      sleepTime,
      wakeTime,
      nightWakings,
      napStart: hasNap ? napStart : null,
      napEnd: hasNap ? napEnd : null,
    });
  }, [bedtime, sleepTime, wakeTime, nightWakings, hasNap, napStart, napEnd]);

  const handleSave = () => {
    const entry: SleepEntry = {
      id: existingId || generateId(),
      date,
      bedtime,
      sleepTime,
      wakeTime,
      nightWakings,
      napStart: hasNap ? napStart : null,
      napEnd: hasNap ? napEnd : null,
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
    toast({ title: "Entry saved" });
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
      toast({ title: "Entry deleted" });
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
    <div className="flex flex-col min-h-full px-5 pt-6 pb-24">
      <div className="mb-6">
        <button
          onClick={() => setCalendarOpen(!calendarOpen)}
          className="w-full text-center py-2"
          data-testid="button-date-picker"
        >
          <div className="text-xl font-medium text-foreground">
            {displayDateStr}
          </div>
          {existingId && (
            <div className="text-xs text-muted-foreground/60 mt-0.5">
              saved
            </div>
          )}
        </button>

        {calendarOpen && (
          <div className="mt-3 rounded-md border border-border/20 bg-card/60 p-4" data-testid="calendar-picker">
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
                <div key={d} className="text-center text-xs text-muted-foreground/40 pb-2 font-medium">
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
                      !isCurrentMonth && "opacity-25",
                      isFutureDay && "opacity-15 cursor-not-allowed",
                      isSelected && "bg-primary/20 rounded-md text-primary font-medium",
                      !isSelected && isCurrentMonth && !isFutureDay && "text-foreground",
                      isToday && !isSelected && "text-primary"
                    )}
                    data-testid={`cal-day-${cd.date}`}
                  >
                    <span>{cd.day}</span>
                    {hasEntry && !isSelected && (
                      <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary/60" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mb-2">
        <SectionLabel>Times</SectionLabel>
        <div className="space-y-0">
          <TimeRow
            label="Bedtime"
            value={bedtime}
            onChange={setBedtime}
            testId="input-bedtime"
          />
        </div>

        <div className="mt-3 rounded-md border border-primary/20 bg-primary/[0.04] px-4">
          <TimeRow
            label="Fell asleep"
            value={sleepTime}
            onChange={setSleepTime}
            testId="input-sleep-time"
          />
          <TimeRow
            label="Woke up"
            value={wakeTime}
            onChange={setWakeTime}
            testId="input-wake-time"
            noBorder
          />
        </div>
      </div>

      <div className="mb-2 mt-6">
        <div className="flex items-center justify-between mb-3">
          <SectionLabel className="mb-0">Night wakings</SectionLabel>
          <Button
            size="icon"
            variant="ghost"
            onClick={addNightWaking}
            data-testid="button-add-waking"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {nightWakings.length === 0 && (
          <div className="text-base text-muted-foreground/40 py-2">None</div>
        )}

        {nightWakings.map((w) => (
          <div
            key={w.id}
            className="flex items-center gap-3 py-3 border-b border-border/15"
          >
            <input
              type="time"
              value={w.start}
              onChange={(e) => updateWaking(w.id, "start", e.target.value)}
              className="bg-transparent text-lg font-light text-foreground tabular-nums focus:outline-none [color-scheme:dark]"
              data-testid={`input-waking-start-${w.id}`}
            />
            <span className="text-muted-foreground/40 text-sm">—</span>
            <input
              type="time"
              value={w.end}
              onChange={(e) => updateWaking(w.id, "end", e.target.value)}
              className="bg-transparent text-lg font-light text-foreground tabular-nums focus:outline-none [color-scheme:dark]"
              data-testid={`input-waking-end-${w.id}`}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeNightWaking(w.id)}
              className="ml-auto"
              data-testid={`button-remove-waking-${w.id}`}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mb-6 mt-4">
        <div className="flex items-center justify-between mb-3">
          <SectionLabel className="mb-0">Nap</SectionLabel>
          {!hasNap && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setHasNap(true)}
              data-testid="button-add-nap"
            >
              <Plus className="w-5 h-5" />
            </Button>
          )}
        </div>

        {!hasNap && (
          <div className="text-base text-muted-foreground/40 py-2">None</div>
        )}

        {hasNap && (
          <div className="flex items-center gap-3 py-3 border-b border-border/15">
            <input
              type="time"
              value={napStart}
              onChange={(e) => setNapStart(e.target.value)}
              className="bg-transparent text-lg font-light text-foreground tabular-nums focus:outline-none [color-scheme:dark]"
              data-testid="input-nap-start"
            />
            <span className="text-muted-foreground/40 text-sm">—</span>
            <input
              type="time"
              value={napEnd}
              onChange={(e) => setNapEnd(e.target.value)}
              className="bg-transparent text-lg font-light text-foreground tabular-nums focus:outline-none [color-scheme:dark]"
              data-testid="input-nap-end"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setHasNap(false)}
              className="ml-auto"
              data-testid="button-remove-nap"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      <div className="py-6 mb-6 border-t border-b border-border/15">
        <div className="grid grid-cols-3 gap-4">
          <MetricDisplay
            label="In bed"
            value={formatDuration(metrics.timeInBed)}
          />
          <MetricDisplay
            label="Asleep"
            value={formatDuration(metrics.totalSleep)}
          />
          <MetricDisplay
            label="Efficiency"
            value={formatEfficiency(metrics.sleepEfficiency)}
            accent
          />
        </div>
        {metrics.napDuration > 0 && (
          <div className="mt-4 text-center">
            <span className="text-sm text-muted-foreground/60">
              +{formatDuration(metrics.napDuration)} nap ·{" "}
              {formatDuration(metrics.adjustedTotal)} total
            </span>
          </div>
        )}
      </div>

      <div className="mb-8">
        <SectionLabel>Daily</SectionLabel>

        <div className="flex items-center justify-between py-4 border-b border-border/15">
          <span className="text-base text-foreground">Drinks</span>
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDrinks(Math.max(0, drinks - 1))}
              disabled={drinks === 0}
              data-testid="button-drinks-minus"
            >
              <span className="text-xl font-light leading-none">−</span>
            </Button>
            <span
              className="text-2xl font-light tabular-nums w-8 text-center"
              data-testid="text-drinks-count"
            >
              {drinks}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDrinks(Math.min(15, drinks + 1))}
              data-testid="button-drinks-plus"
            >
              <span className="text-xl font-light leading-none">+</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between py-4 border-b border-border/15">
          <span className="text-base text-foreground">Spliffs</span>
          <Switch
            checked={weed}
            onCheckedChange={setWeed}
            data-testid="switch-weed"
          />
        </div>

        <div className="flex items-center justify-between py-4 border-b border-border/15">
          <span className="text-base text-foreground">Other</span>
          <Switch
            checked={insights}
            onCheckedChange={setInsights}
            data-testid="switch-insights"
          />
        </div>

        <div className="py-4">
          <div className="text-base text-foreground mb-3">Next-day feeling</div>
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
                      ? "fill-primary text-primary"
                      : "fill-none text-muted-foreground/30"
                  )}
                />
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground/50 mt-2 px-1">
            <span>Terrible</span>
            <span>Great</span>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-base text-foreground mb-2">Notes</div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any observations..."
            className="resize-none border-border/20 bg-transparent text-base min-h-[80px]"
            data-testid="input-notes"
          />
        </div>
      </div>

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
          className="flex-1 text-base"
          data-testid="button-save-entry"
        >
          {existingId ? "Update" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function SectionLabel({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-xs text-muted-foreground/60 uppercase tracking-[0.2em] font-medium mb-3",
        className
      )}
    >
      {children}
    </div>
  );
}

function TimeRow({
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
    <div className={cn("flex items-center justify-between py-4", !noBorder && "border-b border-border/15")}>
      <label className="text-base text-muted-foreground">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-2xl font-light text-foreground tabular-nums text-right focus:outline-none [color-scheme:dark]"
        data-testid={testId}
      />
    </div>
  );
}

function MetricDisplay({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={cn(
          "text-3xl font-light tabular-nums",
          accent ? "text-primary" : "text-foreground"
        )}
        data-testid={`metric-${label.toLowerCase().replace(/\s/g, "-")}`}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground/50 mt-1 uppercase tracking-[0.15em]">
        {label}
      </div>
    </div>
  );
}
