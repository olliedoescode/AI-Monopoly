import { z } from "zod";

/** Money is always integer pence. Never floats. */
export const Pence = z.number().int();

/** A 0-100 bounded stat such as Heat or Condition. */
export const Stat100 = z.number().min(0).max(100);

/** Reputation is the only stat allowed to go negative. */
export const Reputation = z.number().min(-100).max(100);

export const DistrictId = z.enum(["high-street", "old-town", "riverside", "industrial"]);

export const BuyerType = z.enum(["family", "young-professional", "retiree", "commercial"]);

export const Aesthetic = z.enum([
  "retro",
  "modern",
  "victorian",
  "brutalist",
  "rustic",
  "art-deco",
]);

export const PropertyType = z.enum(["house", "flat", "office", "shop", "land"]);

export const TenancyStatus = z.enum(["vacant", "rented", "leased"]);

export const PlanningStatus = z.enum(["none", "houses", "flats", "offices", "mixed"]);

export const Mood = z.enum(["happy", "neutral", "paranoid", "furious", "corrupt"]);

export const PersonaId = z.enum(["chief", "barnaby", "mayor", "vance"]);

export const PlotId = z.string().min(1);

export const ActionId = z.string().min(1);

export type DistrictId = z.output<typeof DistrictId>;
export type BuyerType = z.output<typeof BuyerType>;
export type Aesthetic = z.output<typeof Aesthetic>;
export type PropertyType = z.output<typeof PropertyType>;
export type TenancyStatus = z.output<typeof TenancyStatus>;
export type PlanningStatus = z.output<typeof PlanningStatus>;
export type Mood = z.output<typeof Mood>;
export type PersonaId = z.output<typeof PersonaId>;
export type PlotId = z.output<typeof PlotId>;
export type ActionId = z.output<typeof ActionId>;
