export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function timeDiffMinutes(start: string, end: string): number {
  let s = timeToMinutes(start);
  let e = timeToMinutes(end);
  if (e <= s) e += 24 * 60;
  return e - s;
}

export function calculateMetrics(entry: {
  bedtime: string;
  sleepTime: string;
  wakeTime: string;
  nightWakings: Array<{ start: string; end: string }>;
  napStart: string | null;
  napEnd: string | null;
}) {
  const timeInBed = timeDiffMinutes(entry.bedtime, entry.wakeTime);
  const sleepLatency = timeDiffMinutes(entry.bedtime, entry.sleepTime);
  const totalWakingTime = entry.nightWakings.reduce(
    (sum, w) => sum + timeDiffMinutes(w.start, w.end),
    0
  );
  const totalSleep = Math.max(0, timeInBed - sleepLatency - totalWakingTime);
  const sleepEfficiency = timeInBed > 0 ? (totalSleep / timeInBed) * 100 : 0;

  let napDuration = 0;
  if (entry.napStart && entry.napEnd) {
    napDuration = timeDiffMinutes(entry.napStart, entry.napEnd);
  }

  return {
    timeInBed,
    totalSleep,
    sleepEfficiency,
    sleepLatency,
    totalWakingTime,
    napDuration,
    adjustedTotal: totalSleep + napDuration,
  };
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatEfficiency(pct: number): string {
  return `${Math.round(pct)}%`;
}

export function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateString(d);
}

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDisplayDate(dateStr: string): string {
  const d = parseDate(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatShortDate(dateStr: string): string {
  const d = parseDate(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

export function isToday(dateStr: string): boolean {
  return dateStr === toDateString(new Date());
}

export function isFuture(dateStr: string): boolean {
  return dateStr > toDateString(new Date());
}

export function getDaysInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = startDate;
  while (current <= endDate) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

export function getWeekRange(): { start: string; end: string } {
  const end = toDateString(new Date());
  const start = addDays(end, -6);
  return { start, end };
}

export function getMonthRange(): { start: string; end: string } {
  const end = toDateString(new Date());
  const start = addDays(end, -29);
  return { start, end };
}

export function feelingLabel(n: number): string {
  const labels: Record<number, string> = {
    1: "Terrible",
    2: "Poor",
    3: "OK",
    4: "Good",
    5: "Great",
  };
  return labels[n] || "";
}
