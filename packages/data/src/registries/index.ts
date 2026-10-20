import { z } from "zod";
import { ActionSchema, type Action } from "../schemas/action.js";
import { CardSchema, type Card } from "../schemas/card.js";
import { TownEventSchema, type TownEvent } from "../schemas/event.js";
import { PersonaSchema, type Persona } from "../schemas/persona.js";
import { PropertySchema, type Property } from "../schemas/property.js";

import actionsJson from "./actions.json" with { type: "json" };
import cardsJson from "./cards.json" with { type: "json" };
import eventsJson from "./events.json" with { type: "json" };
import personasJson from "./personas.json" with { type: "json" };
import propertiesJson from "./properties.json" with { type: "json" };

export interface Registries {
  properties: Property[];
  personas: Persona[];
  actions: Action[];
  events: TownEvent[];
  cards: Card[];
}

export class RegistryError extends Error {
  constructor(
    public readonly registry: string,
    public readonly issues: string[],
  ) {
    super(`Invalid ${registry} registry:\n  ${issues.join("\n  ")}`);
    this.name = "RegistryError";
  }
}

function parseRegistry<S extends z.ZodTypeAny>(name: string, schema: S, raw: unknown): z.output<S> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`,
    );
    throw new RegistryError(name, issues);
  }
  return result.data as z.output<S>;
}

function assertUniqueIds(name: string, items: { id: string }[]): void {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const item of items) {
    if (seen.has(item.id)) duplicates.push(item.id);
    seen.add(item.id);
  }
  if (duplicates.length > 0) {
    throw new RegistryError(name, [`duplicate ids: ${duplicates.join(", ")}`]);
  }
}

/**
 * Parses and validates every registry entry. Throws RegistryError with a
 * readable list of problems so a typo in JSON fails loudly at startup.
 */
export function loadRegistries(): Registries {
  const properties = parseRegistry("properties", z.array(PropertySchema), propertiesJson);
  const personas = parseRegistry("personas", z.array(PersonaSchema), personasJson);
  const actions = parseRegistry("actions", z.array(ActionSchema), actionsJson);
  const events = parseRegistry("events", z.array(TownEventSchema), eventsJson);
  const cards = parseRegistry("cards", z.array(CardSchema), cardsJson);

  assertUniqueIds("properties", properties);
  assertUniqueIds("personas", personas);
  assertUniqueIds("actions", actions);
  assertUniqueIds("events", events);
  assertUniqueIds("cards", cards);

  return { properties, personas, actions, events, cards };
}
