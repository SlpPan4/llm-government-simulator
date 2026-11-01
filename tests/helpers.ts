// Общий хелпер для тестов движка (без LLM и сети).

import { createInitialState, type GameState } from '../engine/state.js';
import type { GameMode } from '../engine/config.js';

export function makeState(mode: GameMode = 'realism', tweak?: (s: GameState) => void): GameState {
  const s = createInitialState(mode, 'Тестландия');
  tweak?.(s);
  return s;
}

// rng, который никогда не «выбрасывает» ивент (rng() < chance не срабатывает).
export const noEventRng = (): number => 1;

// rng, который всегда «выбрасывает» ивент и берёт первый eligible.
export const forceEventRng = (): number => 0;
