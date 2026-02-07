import type { SleepEntry, AppSettings } from "@shared/schema";
import { defaultSettings } from "@shared/schema";
import { calculateMetrics } from "./sleepUtils";

const ENTRIES_KEY = "sleep_entries";
const SETTINGS_KEY = "sleep_settings";
const UNLOCKED_KEY = "sleep_unlocked";

export function getAllEntries(): SleepEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getEntryByDate(date: string): SleepEntry | null {
  return getAllEntries().find((e) => e.date === date) || null;
}

export function saveEntry(entry: SleepEntry): void {
  const entries = getAllEntries();
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.push(entry);
  }
  entries.sort((a, b) => b.date.localeCompare(a.date));
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function deleteEntry(id: string): void {
  const entries = getAllEntries().filter((e) => e.id !== id);
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function isUnlocked(): boolean {
  return sessionStorage.getItem(UNLOCKED_KEY) === "true";
}

export function setUnlocked(value: boolean): void {
  if (value) {
    sessionStorage.setItem(UNLOCKED_KEY, "true");
  } else {
    sessionStorage.removeItem(UNLOCKED_KEY);
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function exportToCSV(
  entries: SleepEntry[]
): string {
  const headers = [
    "Date",
    "Bedtime",
    "Sleep Time",
    "Wake Time",
    "Night Wakings",
    "Nap Start",
    "Nap End",
    "Drinks",
    "Spliffs",
    "Other",
    "Feeling",
    "Notes",
    "Time in Bed (min)",
    "Total Sleep (min)",
    "Sleep Efficiency (%)",
    "Sleep Latency (min)",
    "Night Waking Time (min)",
    "Nap Duration (min)",
  ];

  const rows = entries.map((e) => {
    const m = calculateMetrics(e);
    const wakingsStr = e.nightWakings
      .map((w) => `${w.start}-${w.end}`)
      .join("; ");
    return [
      e.date,
      e.bedtime,
      e.sleepTime,
      e.wakeTime,
      `"${wakingsStr}"`,
      e.napStart || "",
      e.napEnd || "",
      e.drinks,
      e.weed ? "Yes" : "No",
      e.insights ? "Yes" : "No",
      e.feeling,
      `"${(e.notes || "").replace(/"/g, '""')}"`,
      m.timeInBed,
      m.totalSleep,
      Math.round(m.sleepEfficiency),
      m.sleepLatency,
      m.totalWakingTime,
      m.napDuration,
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export function seedIfEmpty(): void {
  const entries = getAllEntries();
  if (entries.length > 0) return;

  const now = new Date();
  const sampleEntries: SleepEntry[] = [];

  const patterns = [
    { bedtime: "22:30", sleep: "23:00", wake: "06:45", drinks: 0, weed: false, feeling: 4, notes: "Slept well, woke up refreshed" },
    { bedtime: "23:15", sleep: "23:45", wake: "07:00", drinks: 2, weed: false, feeling: 3, notes: "" },
    { bedtime: "22:00", sleep: "22:20", wake: "06:30", drinks: 0, weed: false, feeling: 5, notes: "Best sleep in weeks" },
    { bedtime: "00:30", sleep: "01:00", wake: "08:00", drinks: 3, weed: true, feeling: 2, notes: "Late night out" },
    { bedtime: "23:00", sleep: "23:30", wake: "07:15", drinks: 1, weed: false, feeling: 4, notes: "" },
    { bedtime: "22:45", sleep: "23:15", wake: "06:00", drinks: 0, weed: false, feeling: 3, notes: "Woke up early" },
    { bedtime: "23:30", sleep: "00:00", wake: "07:30", drinks: 0, weed: true, feeling: 4, notes: "" },
    { bedtime: "22:15", sleep: "22:45", wake: "06:15", drinks: 0, weed: false, feeling: 5, notes: "" },
    { bedtime: "01:00", sleep: "01:30", wake: "08:30", drinks: 4, weed: false, feeling: 2, notes: "Restless night" },
    { bedtime: "23:00", sleep: "23:20", wake: "07:00", drinks: 0, weed: false, feeling: 4, notes: "" },
    { bedtime: "22:30", sleep: "23:00", wake: "06:30", drinks: 1, weed: false, feeling: 3, notes: "" },
    { bedtime: "23:45", sleep: "00:15", wake: "07:45", drinks: 2, weed: true, feeling: 3, notes: "" },
    { bedtime: "22:00", sleep: "22:30", wake: "06:00", drinks: 0, weed: false, feeling: 4, notes: "" },
    { bedtime: "23:15", sleep: "23:45", wake: "07:30", drinks: 0, weed: false, feeling: 5, notes: "Deep, uninterrupted" },
  ];

  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (i + 1));
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    const dateStr = `${y}-${mo}-${da}`;
    const p = patterns[i];

    const nightWakings =
      i % 3 === 0
        ? [{ id: generateId(), start: "03:15", end: "03:35" }]
        : [];

    sampleEntries.push({
      id: generateId(),
      date: dateStr,
      bedtime: p.bedtime,
      sleepTime: p.sleep,
      wakeTime: p.wake,
      nightWakings,
      napStart: i % 5 === 0 ? "14:00" : null,
      napEnd: i % 5 === 0 ? "14:25" : null,
      drinks: p.drinks,
      weed: p.weed,
      insights: i % 4 === 0,
      feeling: p.feeling,
      notes: p.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  localStorage.setItem(ENTRIES_KEY, JSON.stringify(sampleEntries));
}

export function clearAllData(): void {
  localStorage.removeItem(ENTRIES_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  sessionStorage.removeItem(UNLOCKED_KEY);
}
