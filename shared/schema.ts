import { z } from "zod";

export const nightWakingSchema = z.object({
  id: z.string(),
  start: z.string(),
  end: z.string(),
});

export const sleepEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  bedtime: z.string(),
  sleepTime: z.string(),
  wakeTime: z.string(),
  nightWakings: z.array(nightWakingSchema),
  napStart: z.string().nullable(),
  napEnd: z.string().nullable(),
  drinks: z.number().min(0).max(15),
  weed: z.boolean(),
  insights: z.boolean(),
  feeling: z.number().min(1).max(5),
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type NightWaking = z.infer<typeof nightWakingSchema>;
export type SleepEntry = z.infer<typeof sleepEntrySchema>;

export interface AppSettings {
  pinEnabled: boolean;
  pin: string | null;
  defaultBedtime: string;
  defaultSleepTime: string;
  defaultWakeTime: string;
}

export const defaultSettings: AppSettings = {
  pinEnabled: false,
  pin: null,
  defaultBedtime: "22:30",
  defaultSleepTime: "23:00",
  defaultWakeTime: "07:00",
};
