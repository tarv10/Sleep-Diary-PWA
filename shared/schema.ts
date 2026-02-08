import { z } from "zod";

export const nightWakingSchema = z.object({
  id: z.string(),
  start: z.string(),
  end: z.string(),
});

export const factorDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(["boolean", "integer"]),
  max: z.number().optional(),
});

export type FactorDefinition = z.infer<typeof factorDefinitionSchema>;

export const defaultFactors: FactorDefinition[] = [
  { id: "alc_drinks", label: "Alcohol", type: "integer", max: 15 },
  { id: "coffee", label: "Coffee", type: "integer", max: 10 },
  { id: "screens_off", label: "Screens off 1hr", type: "boolean" },
];

export const napEntrySchema = z.object({
  id: z.string(),
  minutes: z.number().min(0),
});

export type NapEntry = z.infer<typeof napEntrySchema>;

export const sleepEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  bedtime: z.string(),
  sleepTime: z.string(),
  wakeTime: z.string(),
  nightWakings: z.array(nightWakingSchema),
  napStart: z.string().nullable(),
  napEnd: z.string().nullable(),
  naps: z.array(napEntrySchema).optional(),
  drinks: z.number().min(0).max(15),
  weed: z.boolean(),
  insights: z.boolean(),
  factorValues: z.record(z.union([z.number(), z.boolean()])).optional(),
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
  factors: FactorDefinition[];
}

export const defaultSettings: AppSettings = {
  pinEnabled: false,
  pin: null,
  defaultBedtime: "22:30",
  defaultSleepTime: "23:00",
  defaultWakeTime: "07:00",
  factors: defaultFactors,
};
