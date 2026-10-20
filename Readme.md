# AI Monopoly — Property Tycoon

A single-player property tycoon game set in a small town. You buy, refurbish and sell property,
bribe the chief of police, keep the bank happy and try to reach £2,000,000 net worth before turn 40
without getting arrested.

The LLM is optional. The engine is a pure TypeScript rules system; the LLM only ever picks from a
pre-filtered list of valid actions.

## Documentation

| Document | Purpose |
| --- | --- |
| [`docs/rulebook.md`](docs/rulebook.md) | The design source of truth: rules, personas, cascades, journey maps |
| [`docs/architecture.md`](docs/architecture.md) | Stack, package boundaries, engine internals, data flow |
| [`plans/implementation-plan.md`](plans/implementation-plan.md) | Staged build order with concrete deliverables |

## Stack

- **Engine** — pure TypeScript, no DOM, no React. Seeded RNG, Zod-validated registries, headless simulation.
- **Data** — JSON registries plus deterministic town generation from a seed.
- **UI** — Vite + React, with a three.js town canvas via `@react-three/fiber` and React panels for the
  property website, HUD, chat and bank ledger.

## Build order

Stages 0 to 6, each playable when it lands. See the implementation plan for the full breakdown.

0. Setup — workspace, engine skeleton, validated data, headless 10-turn run
1. Map — 3D town with curved roads, irregular plots and a fixed town square
2. Resolver and chief — expression evaluator, d100 rolls, ripples, audit cascade
3. Property website — buy, sell, haggle, inspect
4. Persona chat — LLM replies in character and suggests validated actions
5. Systems — loans, tenancy, refurbishment, planning, rivals, full 40-turn game
6. Cards and polish — earned cards, win and lose screens, balance pass, art and sound

## Getting started

Not yet scaffolded. Stage 0 of the implementation plan covers the workspace setup.
