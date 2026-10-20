# Implementation Plan

Derived from [`docs/rulebook.md`](../docs/rulebook.md) and [`docs/architecture.md`](../docs/architecture.md).
Each stage is playable when it lands. Do not start a stage before the previous one is done.

## Stage 0 — Setup

Goal: a repo where the engine loads validated data and runs a headless game.

- [x] Initialise pnpm workspace with `packages/engine`, `packages/data`, `packages/ui`.
- [x] Configure TypeScript strict mode, shared `tsconfig.base.json`.
- [x] Configure Vitest at the workspace root.
- [x] Configure ESLint with the engine import restriction (`react`, `three`, `@react-three/*`, `zustand`).
- [x] Add `packages/engine/src/rng/` seeded PRNG with tests for determinism.
- [x] Add `packages/engine/src/state/` with `GameState` type and `createInitialState(seed)`.
- [x] Add `packages/data/schemas/` Zod schemas for property, persona, action, event, card.
- [x] Add `packages/data/registries/` with a minimal seed registry (a few properties, four personas).
- [x] Add registry loader that parses and validates every entry on load.
- [x] Add `packages/engine/src/sim/` headless runner that plays N turns with a scripted policy.
- [x] Add config module reading `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `VITE_MAP_SEED`.
- [x] Add `docs/` and `plans/` to the repo and link them from `Readme.md`.

Done when: `pnpm test` passes and the headless runner plays 10 turns without crashing.

## Stage 1 — Map

Goal: a 3D town you can click.

- [ ] Add `packages/data/map/town-square.json` with the authored landmark layout.
- [ ] Add `packages/data/map/district-seeds.json` with four district seeds and buyer types.
- [ ] Implement `generator.ts`: road splines, Voronoi districts, plot subdivision.
- [ ] Add `TownMap` Zod schema and a determinism test (same seed, same map).
- [ ] Add a connectivity test: every plot has a frontage on a road, road graph is connected.
- [ ] Scaffold `packages/ui` with Vite + React + R3F.
- [ ] Build `TownCanvas` with camera, lighting rig and ground plane.
- [ ] Build `RoadMesh` from splines as extruded ribbon geometry.
- [ ] Build `PlotMesh` as flat polygons with hover state.
- [ ] Build `BuildingMesh` as extruded footprints with owner tint.
- [ ] Build `LandmarkMesh` for town hall, clock tower, fountain, police and fire station.
- [ ] Add `GameStore` with `selectedPlotId` and `dispatch`.
- [ ] Build `ContextMenu` from the action registry, showing owner, condition and valid actions.

Done when: clicking a house shows its owner, condition and the actions valid for it.

## Stage 2 — Resolver and chief

Goal: the four chief actions work and the audit cascade fires.

- [ ] Implement the sandboxed expression evaluator with `min`/`max`/`clamp`.
- [ ] Add formula validation at registry load.
- [ ] Implement `resolve(state, action, rng)` returning state plus events.
- [ ] Implement precondition checks: cash, AP, target validity, blocked state.
- [ ] Implement d100 roll and success/failure branching.
- [ ] Implement effect application: costs always, then branch effects.
- [ ] Implement ripple rules and persona memory log entries.
- [ ] Implement the audit cascade: Suspicion >= 70 and Heat >= 50 triggers an audit.
- [ ] Implement Chief actions: bribe, tip off, comply, help out.
- [ ] Implement Heat, Reputation, Trust, Suspicion, Greed and mood updates.
- [ ] Implement the turn loop: event, player AP, rival turns, town tick.
- [ ] Add `ActionBar` and `Hud` components wired to the store.
- [ ] Add simulation tests asserting the audit cascade fires under the right conditions.

Done when: bribe, tip off, comply and help out all resolve correctly and the audit cascade fires.

## Stage 3 — Property website

Goal: buy and sell entirely through the in-game computer.

- [ ] Build `PropertyWebsite` panel with listing list and filters (district, price, type).
- [ ] Build listing detail view with value, condition, rent, flags and owner.
- [ ] Implement buy with cash and with mortgage placeholder.
- [ ] Implement sell at asking price.
- [ ] Implement haggle using seller Greed and Trust.
- [ ] Implement fake survey with Heat and Suspicion consequences.
- [ ] Implement inspect revealing hidden code violations.
- [ ] Wire purchases to map owner tint updates.
- [ ] Add `BankLedger` panel showing cash, property values and net worth.

Done when: a property can be bought and sold entirely through the website.

## Stage 4 — Persona chat

Goal: chat leads to a validated action button.

- [ ] Add `packages/ui/src/llm/client.ts` for the OpenAI-compatible endpoint.
- [ ] Build prompt from persona stats, mood, memory log and situation.
- [ ] Define a Zod schema for the LLM response: reply text plus suggested action ids.
- [ ] Filter suggested actions through `checkPreconditions`.
- [ ] Build `ChatWindow` with message list, input and suggested-action buttons.
- [ ] Fall back to standard action buttons when the LLM returns nothing valid.
- [ ] Add a mock LLM mode for offline development and tests.

Done when: a chat produces a "Bribe?" button that runs the normal resolver.

## Stage 5 — Systems

Goal: a full 40-turn game start to finish.

- [ ] Implement mortgages: LTV limit, rate, term, monthly payments.
- [ ] Implement personal loans and debt restructuring.
- [ ] Implement default and foreclosure auction after two missed payments.
- [ ] Implement tenancy: vacant, rented, leased, with rent computation.
- [ ] Implement condition decay and violation risk.
- [ ] Implement refurbishment: levels, cost, duration, value gain, style match bonus.
- [ ] Implement planning permission: application, roll, duration, lobby and bribe.
- [ ] Implement development: pay per unit, duration, new property creation.
- [ ] Implement auctions: start price, reserve, rival bids, 3-turn duration.
- [ ] Implement rival turns using the same action list.
- [ ] Implement town events: market shift, crime wave, interest rate change.
- [ ] Implement win and lose checks: net worth target, bankruptcy, Heat arrest.

Done when: a full 40-turn game can be played start to finish.

## Stage 6 — Cards and polish

Goal: the game feels fair.

- [ ] Implement card earning at Reputation milestones, turns 10/20/30 and favours.
- [ ] Implement the five example cards: Golden Tongue, Ghost Contractor, Inside Info, Clean Record, Fast Track.
- [ ] Add card play UI before an action resolves.
- [ ] Add win and lose screens.
- [ ] Run thousands of headless games and tune the numbers in the registries.
- [ ] Add art pass: building styles, landmark detail, lighting mood.
- [ ] Add sound: UI clicks, purchase, audit sting, town ambience.
- [ ] Add save and load using the seeded RNG and serialised state.

Done when: 20 simulated playthroughs feel fair and the game is playable end to end with art and sound.

## Cross-cutting

- [ ] Keep `docs/rulebook.md` updated whenever a rule changes.
- [ ] Keep `docs/architecture.md` updated whenever a boundary or dependency changes.
- [ ] Every new registry entry gets a Zod schema and a load-time test.
- [ ] Every new action gets a precondition test and a resolution test.
- [ ] Run the headless simulation suite before merging any balance change.
