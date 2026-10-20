import { loadRegistries } from "@ai-monopoly/data";
import { runSimulation } from "./index.js";

const turns = Number(process.argv[2] ?? 10);
const seed = Number(process.argv[3] ?? 1);

if (!Number.isInteger(turns) || turns < 1) {
  console.error(`turns must be a positive integer, got "${process.argv[2]}"`);
  process.exit(1);
}
if (!Number.isInteger(seed)) {
  console.error(`seed must be an integer, got "${process.argv[3]}"`);
  process.exit(1);
}

const registries = loadRegistries();
const result = runSimulation({ seed, registries, turns });

console.log(`Seed ${seed}, ${result.turnsPlayed} turns played`);
console.log(`Status: ${result.state.status}${result.state.lostReason ? ` (${result.state.lostReason})` : ""}`);
console.log(`Turn: ${result.state.turn}`);
console.log(`Cash: £${(result.state.cash / 100).toLocaleString("en-GB")}`);
console.log(`Heat: ${result.state.heat}  Reputation: ${result.state.reputation}`);
console.log(`Events emitted: ${result.events.length}`);

const counts = new Map<string, number>();
for (const event of result.events) {
  counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
}
for (const [type, count] of [...counts].sort()) {
  console.log(`  ${type}: ${count}`);
}
