import { z } from "zod";
import { Mood, PersonaId, Stat100 } from "./common.js";

export const MemoryEntrySchema = z.object({
  turn: z.number().int().positive(),
  summary: z.string().min(1),
  /** Signed effect on Trust, for the LLM to reason about. */
  trustDelta: z.number().int(),
});

export const PersonaSchema = z.object({
  id: PersonaId,
  name: z.string().min(1),
  role: z.string().min(1),
  /** Where they can be found on the map. */
  location: z.string().min(1),
  trust: Stat100,
  suspicion: Stat100,
  greed: Stat100,
  mood: Mood,
  /** Price above which a bribe is considered generous. */
  greedPrice: z.number().int().nonnegative(),
  memory: z.array(MemoryEntrySchema).default([]),
});

export type Persona = z.output<typeof PersonaSchema>;
export type MemoryEntry = z.output<typeof MemoryEntrySchema>;
