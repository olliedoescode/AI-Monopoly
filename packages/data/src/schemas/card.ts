import { z } from "zod";
import { EffectSchema } from "./action.js";

export const CardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  /** How many times the card can be played before it is spent. */
  uses: z.number().int().positive(),
  /** Flat bonus added to the success chance of a matching action. */
  chanceBonus: z.number().int().default(0),
  /** Actions this card can be played on. Empty means any. */
  appliesTo: z.array(z.string()).default([]),
  effects: z.array(EffectSchema).default([]),
});

export type Card = z.output<typeof CardSchema>;
