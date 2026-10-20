# Property Tycoon: Project Plan and Rulebook

Draft 1, 20 October 2026. Working title. Every number is a tuning starting point, not a final value.

> This file is the canonical design context for the project. It is the source of truth for
> gameplay rules and the build order. Implementation notes live in `docs/architecture.md`
> and the actionable task list lives in `plans/implementation-plan.md`.

## 1. Project plan

Build order: playable at every stage, LLM optional until stage 4.

| Stage | What gets built | Done when |
| --- | --- | --- |
| 0. Setup | Vite + TypeScript repo, engine folder with no rendering code, JSON validation (Zod or Ajv), seeded RNG, `LLM_BASE_URL` config | Engine loads the schema and a headless test runs 10 turns |
| 1. Map | Top-down 2D map (PixiJS), clickable buildings and plots, owner tint toggle, context menu built from the action registry | You can click a house and see owner, condition and valid actions |
| 2. Resolver + chief | Expression evaluator, success rolls, effects, ripple rules, audit event, the four chief actions | Bribe, tip off, comply and help out all work and the audit cascade fires |
| 3. Property website | In-game computer showing listings, filters, buy, sell, haggle, inspection | You can buy and sell a property entirely through the website |
| 4. Persona chat | Click a persona, chat, LLM replies in character and returns suggested actions as buttons | A chat leads to a "Bribe?" button that runs the normal resolver |
| 5. Systems | Loans and mortgages, tenancy, refurbishment, planning permission and development, rival turns | A full 40-turn game can be played start to finish |
| 6. Cards + polish | Earned cards, win and lose screens, balance pass using headless simulations, art and sound | Game feels fair over 20 simulated playthroughs |

Suggested pacing if you want a playable slice in about a month: stages 0 to 3 in weeks 1 to 3, stage 4 in week 4, stages 5 and 6 afterwards. Treat that as a target, not a promise.

Main risks and the answer to each:

- Scope: ship each stage before starting the next.
- Small-model mistakes: the LLM only ever picks from a pre-filtered action list, and the engine validates everything.
- Balance: run thousands of headless games from stage 2 onwards.
- Typos in data: validate every registry entry on load.

## 2. Rulebook (as if it were a board game)

### 2.1 Components

- **The board:** the town map, about 100 tiles, containing roughly 24 plots (built properties and empty land) across 4 districts.
- **Money:** one currency, pounds, tracked in pence.
- **Property cards:** address, district, aesthetic, target buyer, value, condition, rent, flags.
- **Persona cards:** Chief O'Malley, Barnaby the bank manager, Mayor Hickenlooper, Victoria Vance (rival). Each has Trust, Suspicion, Greed, a mood and a memory log.
- **Trackers:** Heat (0 to 100), Reputation (-100 to 100), Turn (1 to 40).
- **Action cards:** earned one-use or limited-use modifiers.
- **Dice:** one d100 for every uncertain action. Roll equal to or under the success chance to succeed.

### 2.2 Setup

You start with £250,000 cash, two properties (one retro house with a hidden code violation, one slum flat), Heat 20, Reputation 0. Chief starts at Trust 10, Suspicion 15, Greed 60. Vance owns the best properties on High Street.

### 2.3 Winning and losing

- **Win:** reach £2,000,000 net worth (cash plus property values minus debts) by turn 40.
- **Lose:** bankrupt (cash below zero with nothing left to sell), or Heat at 100 for two turns in a row (arrested).

### 2.4 A turn (one turn is one month)

1. **Event.** Draw a town event (market shift, crime wave, interest rate change).
2. **Your turn.** You have 3 Action Points (AP). Talking to personas and browsing the website is free. Doing things costs 1 AP each.
3. **Rival turns.** Vance and other rivals take actions from the same action list.
4. **Town tick.** Rent comes in, loan payments go out, renovations count down, Heat drops by 2, rules are checked (for example the audit rule).

### 2.5 How an action resolves

1. Check preconditions (enough cash, valid target, not blocked).
2. Compute success chance from the action's formula, using the target's stats.
3. Add any card bonus.
4. Roll d100. At or under the chance succeeds.
5. Apply costs (always), then success or failure effects, then ripples to other personas.
6. The persona logs it in their memory, which the LLM uses for later chat and narration.

### 2.5b Persona stats

- **Trust:** how much they like and believe you. Raises most success chances.
- **Suspicion:** how closely they are watching you. Lowers success chances and triggers audits at 70 or more.
- **Greed:** how much they want money. Raises bribe prices. Above 90 the persona turns Corrupt.
- **Mood:** Happy, Neutral, Paranoid, Furious, Corrupt. Mood changes dialogue and a few formulas.

### 2.6 Personas and what you can do with them

**Chief O'Malley (police)**

- Bribe: pay to reduce Heat. Chance rises with Trust and with paying above his greed price, falls with Suspicion. Failure raises Heat by 20 and Suspicion by 15.
- Tip off: report a rival property. True claims work well and build Trust, false claims destroy it.
- Comply: pay £5,000 to fix a violation properly. Always works, small Trust gain.
- Help out: donate to the police fund for Trust and lower Suspicion.

**Barnaby (bank)**

- Mortgage: up to 75% of a property's value, interest is the city rate plus 2%, terms of 12 to 24 turns.
- Personal loan: smaller, higher interest, no property needed.
- Restructure debt: lower payments for more interest, needs Trust.
- Missing 2 payments in a row means default and the property goes to foreclosure auction.

**Mayor Hickenlooper (planning)**

- Apply for planning permission on a plot.
- Lobby or bribe for faster or more likely approval.
- Host a gala: costs money, raises Reputation and Trust.

**Victoria Vance (rival)**

- Propose a merger, buy out a property, or run a slander campaign. She also does the same to you, using the same rules.

### 2.7 Property rules

- **Value:** base value adjusted by condition and by how well the aesthetic fits the district. A match with the district's buyer type gives a bonus.
- **Condition:** 0 to 100. Low condition cuts value and rent. Tenants and weather lower it slowly.
- **Inspect:** costs 1 AP and reveals hidden code violations.
- **Refurbish:** each level (0 to 5) costs about 8% of base value, takes 2 turns, and adds about 10% value, with an extra bonus if you pick a style that matches the target buyer. The property earns nothing while under renovation.
- **Tenancy:** Vacant, Rented (monthly rent, tenant-type match gives more), or Leased (fixed rent locked for 5 turns, higher for commercial).
- **Sell:** list at an asking price, or put it up for auction with a start price and a reserve. Auctions take 3 turns and rivals can bid.
- **Haggle** (buying): talk the seller down. Success depends on their Greed and Trust.
- **Fake survey** (buying): plant evidence of damage to lower the price. Success lowers value and price, failure raises Heat and the seller's Suspicion.
- **Vacant land:** has a planning status of None, Houses, Flats, Offices or Mixed. You must hold permission before building.
- **Develop:** pay per unit, takes 3 turns, creates a new property with a type set by the permission.

### 2.8 Cascades (the part that makes it a sandbox)

- Bribe fails: Heat up, Chief Suspicion up. If Suspicion is 70 or more and Heat is 50 or more, the Chief audits one of your properties that has a violation (fine, Reputation loss).
- Tip off true: rival's property flagged, rival Trust in you drops, Chief Trust up.
- Bribe Mayor: Chief Suspicion rises a little.
- Default on a loan: foreclosure auction, Reputation falls, Barnaby's Trust falls.
- Many successful bribes: persona Greed rises until the price is too high or they turn Corrupt.

### 2.9 Cards

Earned at Reputation milestones, at turns 10, 20 and 30, and as rewards for favours. Examples: **Golden Tongue** (+20 to one haggle or bribe), **Ghost Contractor** (one refurbishment at half price), **Inside Info** (free inspection of any listing), **Clean Record** (Heat -20), **Fast Track** (one planning application auto-approved).

## 3. Journey maps

Each map is the player's path through one mechanic: what they do, what the engine does, what changes.

**Buy a property**

1. Click the computer icon → browse listings and filters → open a listing.
2. Optional: pay 1 AP to inspect, or chat with the seller, or haggle or fake a survey.
3. Click Buy → engine checks cash or mortgage → ownership changes, map tint updates.
4. Ripple: seller persona logs the deal, a rival may react if they wanted it.

**Haggle or fake a survey**

1. On a listing, chat with the seller or click Haggle.
2. Engine rolls using the seller's Greed and Trust.
3. Success: price drops, listing updated. Failure: Trust drops, and for a fake survey Heat rises.
4. Ripple: Chief may notice a pattern if you fake repeatedly.

**Refurbish**

1. Click your building on the map → Refurbish.
2. Pick a style and level → engine checks cash and AP.
3. Property shows scaffolding for 2 turns, rent stops.
4. Done: condition and value rise, style match bonus applied.

**Rent or lease**

1. Click your building → Change tenancy.
2. Choose Vacant, Rented or Leased → engine computes expected rent from condition, aesthetic and buyer match.
3. Each town tick: rent arrives, condition slowly drops.
4. Ripple: neglected condition raises violation risk and audit exposure.

**Sell or auction**

1. Click your building → Sell → choose a fixed price or an auction.
2. Listing appears on the website, rivals and the market bid or buy.
3. Sale closes: cash arrives, any mortgage is paid off, ownership changes.
4. Ripple: a big profit raises Reputation, but Vance notices.

**Bribe the chief**

1. Click the Chief (or chat with him) → choose Bribe → set the amount.
2. Engine checks cash and Suspicion, rolls.
3. Success: Heat down, Greed up. Failure: Heat and Suspicion up.
4. Ripple: repeated bribes raise his price, and failures push toward an audit.

**Tip off the chief**

1. Click the Chief → Tip off → pick a rival property.
2. Engine checks whether the claim is true, rolls.
3. Success: the rival property is flagged and investigated. Failure: Chief Trust crashes.
4. Ripple: rival Trust in you drops and she may retaliate.

**Chat leading to an action**

1. Click a persona → type something → LLM replies in character.
2. LLM also returns suggested actions, which the engine filters to valid ones only.
3. Buttons appear (for example "Offer a bribe") → player confirms → normal resolver runs.
4. If the LLM suggests nothing, the standard action buttons are still there.

**Mortgage or loan**

1. Click Barnaby (or a property) → Request mortgage → choose a property and amount.
2. Engine checks the loan-to-value limit and Trust → offers a rate and term.
3. Accept: cash arrives, monthly payments start on each town tick.
4. Miss two payments: default, foreclosure auction, Reputation and Barnaby's Trust fall.

**Plot to development**

1. Click an empty plot → opens its page on the computer with price and planning status.
2. Buy it → click Apply for planning → pick Houses, Flats, Offices or Mixed.
3. Engine rolls using the Mayor's Trust, 3 turns pass. Option: lobby or bribe the Mayor.
4. Approved: pay to develop, 3 turns, a new property appears.
5. Ripple: bribing the Mayor raises Chief Suspicion.

**Cards**

1. Earn a card from a milestone or favour.
2. Before an action resolves, optionally play a card.
3. Engine adds the bonus, the card's uses go down.
4. Ripple: some cards raise Heat or change a persona's mood when used.
