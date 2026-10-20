import { z } from "zod";
import { ActionId, PersonaId } from "./common.js";

/**
 * Effects are declarative so the resolver can apply them generically.
 * Every effect names a target and a signed amount.
 */
export const EffectSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("cash"), amount: z.number().int() }),
  z.object({ kind: z.literal("heat"), amount: z.number().int() }),
  z.object({ kind: z.literal("reputation"), amount: z.number().int() }),
  z.object({
    kind: z.literal("personaStat"),
    persona: PersonaId,
    stat: z.enum(["trust", "suspicion", "greed"]),
    amount: z.number().int(),
  }),
  z.object({ kind: z.literal("setMood"), persona: PersonaId, mood: z.string() }),
  z.object({ kind: z.literal("flagProperty"), propertyId: z.string() }),
  z.object({ kind: z.literal("revealViolation"), propertyId: z.string() }),
]);

export const ActionSchema = z.object({
  id: ActionId,
  label: z.string().min(1),
  persona: PersonaId,
  /** Action point cost. Chat and browsing are free and are not in this registry. */
  apCost: z.number().int().min(0).max(3),
  /** Sandboxed arithmetic formula. Parsed and validated at load. */
  successFormula: z.string().min(1),
  /** Applied regardless of success. */
  costs: z.array(EffectSchema).default([]),
  onSuccess: z.array(EffectSchema).default([]),
  onFailure: z.array(EffectSchema).default([]),
  /** Applied to other personas after the branch resolves. */
  ripples: z.array(EffectSchema).default([]),
});

export type Action = z.output<typeof ActionSchema>;
export type Effect = z.output<typeof EffectSchema>;
