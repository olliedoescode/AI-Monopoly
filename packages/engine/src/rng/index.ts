/**
 * Seeded PRNG. mulberry32: small, fast, good enough for a game, and fully
 * deterministic from a 32-bit seed. The seed lives in GameState so a save
 * file reproduces the exact same run.
 */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [1, sides]. Used for the d100. */
  roll(sides: number): number;
  /** Current internal state, for serialisation. */
  readonly state: number;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;

  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    roll(sides: number): number {
      if (!Number.isInteger(sides) || sides < 1) {
        throw new Error(`roll() needs a positive integer side count, got ${sides}`);
      }
      return Math.floor(next() * sides) + 1;
    },
    get state(): number {
      return a;
    },
  };
}

/** Derives a stable 32-bit seed from a string, for named scenarios. */
export function seedFromString(input: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}
