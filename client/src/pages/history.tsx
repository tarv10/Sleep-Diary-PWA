import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import type { SleepEntry } from "@shared/schema";
import { getAllEntries } from "@/lib/storage";
import {
  calculateMetrics,
  formatDuration,
  formatEfficiency,
  formatDisplayDate,
} from "@/lib/sleepUtils";

export default function HistoryPage() {
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [, navigate] = useLocation();

  useEffect(() => {
    setEntries(getAllEntries());
  }, []);

  return (
    <div className="px-5 pt-6 pb-24">
      <h1 className="text-2xl font-medium mb-1 tracking-tight">History</h1>
      <p className="text-[10px] text-muted-foreground/40 mb-6 uppercase tracking-[0.15em]">
        {entries.length} {entries.length === 1 ? "entry" : "entries"}
      </p>

      {entries.length === 0 && (
        <div className="text-center text-muted-foreground/30 py-20">
          <div className="text-sm">No entries yet</div>
        </div>
      )}

      <div className="space-y-0">
        {entries.map((entry) => {
          const m = calculateMetrics(entry);
          const hasSubs = entry.drinks > 0 || entry.weed;
          return (
            <button
              key={entry.id}
              onClick={() => navigate(`/log/${entry.date}`)}
              className="w-full flex items-center justify-between py-4 border-b border-border/8 text-left"
              data-testid={`entry-${entry.date}`}
            >
              <div className="min-w-0 flex-1">
                <div className="text-base font-medium text-foreground/90">
                  {formatDisplayDate(entry.date)}
                </div>
                <div className="text-xs text-muted-foreground/30 mt-0.5 tabular-nums">
                  {entry.bedtime} — {entry.wakeTime}
                  {hasSubs && (
                    <span className="text-zone-substance/50 ml-1.5">
                      {entry.drinks > 0 && `${entry.drinks}d`}
                      {entry.drinks > 0 && entry.weed && " · "}
                      {entry.weed && "w"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-5 flex-shrink-0">
                <div className="text-right">
                  <div className="text-base tabular-nums font-light text-foreground/90">
                    {formatDuration(m.totalSleep)}
                  </div>
                  <div className="text-[10px] text-zone-sleep/50 tabular-nums uppercase">
                    {formatEfficiency(m.sleepEfficiency)}
                  </div>
                </div>

                <div className="flex gap-[3px]">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className={cn(
                        "w-[5px] h-[5px] rounded-full transition-colors",
                        n <= entry.feeling ? "bg-zone-reflection/60" : "bg-muted/20"
                      )}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
