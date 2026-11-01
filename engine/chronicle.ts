// Хроника и реестр персонажей ведёт код движка (спецификация, закон 7).

import { CONFIG } from './config.js';
import type { GameState, Character } from './state.js';

// Однострочная запись истории; лимит — последние N записей,
// старые схлопываются в сводный счётчик.
export function pushChronicle(state: GameState, text: string): void {
  state.chronicle.push(text);
  while (state.chronicle.length > CONFIG.run.chronicleLimit) {
    state.chronicle.shift();
    state.chronicleCollapsed += 1;
  }
}

export function findCharacter(state: GameState, name: string): Character | undefined {
  const n = name.trim().toLowerCase();
  return state.characters.find((c) => c.name.trim().toLowerCase() === n);
}

// Новый персонаж только если имени ещё нет; иначе null (ссылка на существующего).
export function addCharacter(state: GameState, name: string, role: string): Character | null {
  const trimmed = name.trim();
  if (!trimmed || findCharacter(state, trimmed)) return null;
  const character: Character = { name: trimmed, role: role.trim() || 'неизвестная роль', attitude: 0, alive: true };
  state.characters.push(character);
  return character;
}
