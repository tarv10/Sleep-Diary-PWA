import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from "lucide-react";
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
} from "@/lib/storage";
import {
  calculateMetrics,
  formatDuration,
  formatEfficiency,
  getYesterday,
  formatDisplayDate,
  addDays,
  isFuture,
  toDateString,
} from "@/lib/sleepUtils";

interface LogPageProps {
  initialDate?: string;
}

export default function LogPage({ initialDate }: LogPageProps) {
  const { toast } = useToast();
  const [date, setDate] = useState(initialDate || getYesterday());
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

  const prevDate = () => setDate(addDays(date, -1));
  const nextDate = () => {
    const next = addDays(date, 1);
    if (!isFuture(next)) setDate(next);
  };

  const todayStr = toDateString(new Date());
  const canGoNext = addDays(date, 1) <= todayStr;

  return (
    <div className="flex flex-col min-h-full px-5 pt-6 pb-24">
      <div className="flex items-center justify-between mb-8">
        <Button
          size="icon"
          variant="ghost"
          onClick={prevDate}
          data-testid="button-prev-date"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <button
          className="text-center"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "date";
            input.value = date;
            input.max = todayStr;
            input.style.position = "absolute";
            input.style.opacity = "0";
            input.style.pointerEvents = "none";
            document.body.appendChild(input);
            input.addEventListener("change", () => {
              if (input.value) setDate(input.value);
              document.body.removeChild(input);
            });
            input.addEventListener("blur", () => {
              setTimeout(() => {
                if (document.body.contains(input)) {
                  document.body.removeChild(input);
                }
              }, 300);
            });
            input.showPicker?.();
            input.click();
          }}
          data-testid="button-date-picker"
        >
          <div className="text-sm font-medium text-foreground">
            {formatDisplayDate(date)}
          </div>
          {existingId && (
            <div className="text-[10px] text-muted-foreground/60 mt-0.5">
              saved
            </div>
          )}
        </button>
        <Button
          size="icon"
          variant="ghost"
          onClick={nextDate}
          disabled={!canGoNext}
          data-testid="button-next-date"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
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
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {nightWakings.length === 0 && (
          <div className="text-sm text-muted-foreground/40 py-2">None</div>
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
              className="bg-transparent text-base font-light text-foreground tabular-nums focus:outline-none"
              data-testid={`input-waking-start-${w.id}`}
            />
            <span className="text-muted-foreground/40 text-xs">—</span>
            <input
              type="time"
              value={w.end}
              onChange={(e) => updateWaking(w.id, "end", e.target.value)}
              className="bg-transparent text-base font-light text-foreground tabular-nums focus:outline-none"
              data-testid={`input-waking-end-${w.id}`}
            />
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

      <div className="mb-6 mt-4">
        <div className="flex items-center justify-between mb-3">
          <SectionLabel className="mb-0">Nap</SectionLabel>
          <Switch
            checked={hasNap}
            onCheckedChange={setHasNap}
            data-testid="switch-nap"
          />
        </div>
        {hasNap && (
          <div className="flex items-center gap-3 py-3 border-b border-border/15">
            <input
              type="time"
              value={napStart}
              onChange={(e) => setNapStart(e.target.value)}
              className="bg-transparent text-base font-light text-foreground tabular-nums focus:outline-none"
              data-testid="input-nap-start"
            />
            <span className="text-muted-foreground/40 text-xs">—</span>
            <input
              type="time"
              value={napEnd}
              onChange={(e) => setNapEnd(e.target.value)}
              className="bg-transparent text-base font-light text-foreground tabular-nums focus:outline-none"
              data-testid="input-nap-end"
            />
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
            <span className="text-xs text-muted-foreground/60">
              +{formatDuration(metrics.napDuration)} nap ·{" "}
              {formatDuration(metrics.adjustedTotal)} total
            </span>
          </div>
        )}
      </div>

      <div className="mb-8">
        <SectionLabel>Daily</SectionLabel>

        <div className="flex items-center justify-between py-4 border-b border-border/15">
          <span className="text-sm text-foreground">Drinks</span>
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDrinks(Math.max(0, drinks - 1))}
              disabled={drinks === 0}
              data-testid="button-drinks-minus"
            >
              <span className="text-lg font-light leading-none">−</span>
            </Button>
            <span
              className="text-xl font-light tabular-nums w-6 text-center"
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
              <span className="text-lg font-light leading-none">+</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between py-4 border-b border-border/15">
          <span className="text-sm text-foreground">Cannabis</span>
          <Switch
            checked={weed}
            onCheckedChange={setWeed}
            data-testid="switch-weed"
          />
        </div>

        <div className="flex items-center justify-between py-4 border-b border-border/15">
          <span className="text-sm text-foreground">Insights</span>
          <Switch
            checked={insights}
            onCheckedChange={setInsights}
            data-testid="switch-insights"
          />
        </div>

        <div className="py-4">
          <div className="text-sm text-foreground mb-3">Next-day feeling</div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Button
                key={n}
                variant={feeling === n ? "default" : "ghost"}
                className="flex-1"
                onClick={() => setFeeling(n)}
                data-testid={`button-feeling-${n}`}
              >
                {n}
              </Button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-2 px-1">
            <span>Terrible</span>
            <span>Great</span>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm text-foreground mb-2">Notes</div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any observations..."
            className="resize-none border-border/20 bg-transparent text-sm min-h-[80px]"
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
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
        <Button
          onClick={handleSave}
          className="flex-1"
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
        "text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em] font-medium mb-3",
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border/15">
      <label className="text-sm text-muted-foreground">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-xl font-light text-foreground tabular-nums text-right focus:outline-none [color-scheme:dark]"
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
          "text-2xl font-light tabular-nums",
          accent ? "text-primary" : "text-foreground"
        )}
        data-testid={`metric-${label.toLowerCase().replace(/\s/g, "-")}`}
      >
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground/50 mt-1 uppercase tracking-[0.15em]">
        {label}
      </div>
    </div>
  );
}
