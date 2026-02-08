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
  naps?: Array<{ minutes: number }>;
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
  if (entry.naps && entry.naps.length > 0) {
    napDuration = entry.naps.reduce((sum, n) => sum + n.minutes, 0);
  } else if (entry.napStart && entry.napEnd) {
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

export type SleepQuality = "good" | "ok" | "poor";

export function getSleepQuality(entry: {
  bedtime: string;
  sleepTime: string;
  wakeTime: string;
  nightWakings: Array<{ start: string; end: string }>;
  napStart: string | null;
  napEnd: string | null;
  feeling: number;
}): SleepQuality {
  const m = calculateMetrics(entry);

  let score = 0;

  if (m.sleepEfficiency >= 85) score += 2;
  else if (m.sleepEfficiency >= 75) score += 1;

  const sleepHours = m.totalSleep / 60;
  if (sleepHours >= 7) score += 2;
  else if (sleepHours >= 6) score += 1;

  if (entry.feeling >= 4) score += 2;
  else if (entry.feeling >= 3) score += 1;

  if (score >= 5) return "good";
  if (score >= 3) return "ok";
  return "poor";
}

export function getCalendarDays(year: number, month: number): { date: string; day: number; inMonth: boolean }[] {
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();

  const days: { date: string; day: number; inMonth: boolean }[] = [];

  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ date: dateStr, day: d, inMonth: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ date: dateStr, day: d, inMonth: true });
  }

  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ date: dateStr, day: d, inMonth: false });
    }
  }

  return days;
}

export function formatMonthYear(year: number, month: number): string {
  const d = new Date(year, month, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
