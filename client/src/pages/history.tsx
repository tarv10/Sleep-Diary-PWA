import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import type { SleepEntry } from "@shared/schema";
import { getAllEntries, getSettings, getFactorValue, deleteEntry } from "@/lib/storage";
import {
  calculateMetrics,
  formatDuration,
  formatEfficiency,
  formatDisplayDate,
} from "@/lib/sleepUtils";

export default function HistoryPage() {
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const factorDefs = getSettings().factors;
  const [, navigate] = useLocation();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    setEntries(getAllEntries());
  }, []);

  const handleDelete = (id: string) => {
    deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setConfirmId(null);
  };

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
          const activeFactors = factorDefs.filter((f) => {
            const val = getFactorValue(entry, f.id);
            return f.type === "integer" ? (val as number) > 0 : !!val;
          });
          return (
            <SwipeableRow
              key={entry.id}
              entryId={entry.id}
              onSwipeDelete={() => setConfirmId(entry.id)}
            >
              <button
                onClick={() => navigate(`/log/${entry.date}`)}
                className="w-full flex items-center justify-between py-4 border-b border-border/8 text-left bg-[#0D1117]"
                data-testid={`entry-${entry.date}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-base font-medium text-foreground/90">
                    {formatDisplayDate(entry.date)}
                  </div>
                  <div className="text-xs text-muted-foreground/30 mt-0.5 tabular-nums">
                    {entry.bedtime} — {entry.wakeTime}
                    {activeFactors.length > 0 && (
                      <span className="text-zone-substance/50 ml-1.5">
                        {activeFactors.map((f, i) => {
                          const val = getFactorValue(entry, f.id);
                          const display = f.type === "integer" ? `${val}` : f.label.charAt(0).toLowerCase();
                          return (
                            <span key={f.id}>
                              {i > 0 && " · "}
                              {display}
                            </span>
                          );
                        })}
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
            </SwipeableRow>
          );
        })}
      </div>

      {confirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setConfirmId(null)}
          data-testid="delete-confirm-overlay"
        >
          <div
            className="bg-[#161b22] rounded-md px-6 py-5 mx-8 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-foreground/90 mb-1">Delete this entry?</p>
            <p className="text-xs text-muted-foreground/40 mb-5">
              This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmId(null)}
                className="text-xs text-muted-foreground/50 px-4 py-2"
                data-testid="button-cancel-delete"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmId)}
                className="text-xs text-destructive px-4 py-2 rounded-md bg-destructive/10"
                data-testid="button-confirm-delete"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SwipeableRow({
  children,
  entryId,
  onSwipeDelete,
}: {
  children: React.ReactNode;
  entryId: string;
  onSwipeDelete: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const swiping = useRef(false);
  const [offset, setOffset] = useState(0);
  const threshold = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = 0;
    swiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    if (dx < -10) {
      swiping.current = true;
    }
    if (swiping.current) {
      const clampedOffset = Math.min(0, Math.max(-120, dx));
      currentX.current = clampedOffset;
      setOffset(clampedOffset);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (currentX.current < -threshold) {
      onSwipeDelete();
    }
    setOffset(0);
    swiping.current = false;
  }, [onSwipeDelete]);

  const deleteRevealed = offset < -threshold;

  return (
    <div className="relative overflow-hidden" data-testid={`swipeable-${entryId}`}>
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-center transition-opacity",
          deleteRevealed ? "opacity-100" : "opacity-60"
        )}
        style={{ width: Math.abs(offset) || 0, minWidth: offset !== 0 ? 40 : 0 }}
      >
        <Trash2 className={cn(
          "w-4 h-4 transition-colors",
          deleteRevealed ? "text-destructive" : "text-muted-foreground/50"
        )} />
      </div>
      <div
        ref={rowRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: offset === 0 ? "transform 0.2s ease-out" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
