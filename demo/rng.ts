// Seeded RNG for the headless demo (mulberry32): the engine and MockLLM share
// one instance, so a fixed seed replays the exact same run. The regular game
// keeps using Math.random (engine default, law: behavior must not change).

export type Rng = () => number;

export function createSeededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
