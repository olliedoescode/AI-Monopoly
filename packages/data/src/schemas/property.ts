import { z } from "zod";
import {
  Aesthetic,
  BuyerType,
  DistrictId,
  Pence,
  PlanningStatus,
  PlotId,
  PropertyType,
  Stat100,
  TenancyStatus,
} from "./common.js";

export const PropertyFlagsSchema = z.object({
  /** Hidden until inspected. Drives the audit cascade. */
  codeViolation: z.boolean().default(false),
  /** Set when the Chief has flagged the property after a tip off. */
  flagged: z.boolean().default(false),
  /** Set while a refurbishment is in progress. */
  underRenovation: z.boolean().default(false),
  /** Set while a development is in progress. */
  underDevelopment: z.boolean().default(false),
});

export const PropertySchema = z.object({
  id: z.string().min(1),
  plotId: PlotId,
  address: z.string().min(1),
  district: DistrictId,
  type: PropertyType,
  aesthetic: Aesthetic,
  targetBuyer: BuyerType,
  baseValue: Pence.positive(),
  condition: Stat100,
  rentPerTurn: Pence.nonnegative(),
  tenancy: TenancyStatus,
  refurbishmentLevel: z.number().int().min(0).max(5),
  planningStatus: PlanningStatus,
  flags: PropertyFlagsSchema,
});

/** Parsed output type: defaults are applied, so every field is present. */
export type Property = z.output<typeof PropertySchema>;
export type PropertyFlags = z.output<typeof PropertyFlagsSchema>;
