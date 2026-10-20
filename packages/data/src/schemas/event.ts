import { z } from "zod";
import { EffectSchema } from "./action.js";

export const TownEventSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  /** Relative likelihood when drawing an event. */
  weight: z.number().positive().default(1),
  effects: z.array(EffectSchema).default([]),
});

export type TownEvent = z.output<typeof TownEventSchema>;
