// Хроника и реестр персонажей ведёт код движка (спецификация, закон 7).
// Хроника — это структурированные записи (ключи сообщений), а не готовые
// строки: движок языка не знает (закон 2), а слой LLM/UI рендерит записи
// в текст на языке рана через словарь i18n.ts.

import { CONFIG } from './config.js';
import type { GameState, Character } from './state.js';
import type { EndingReason } from './score.js';

// Исходы завершения арок, которые разрешает движок (7.7) — только ключи.
export type ArcOutcomeKey =
  | 'coup_suppressed' | 'protests_calm' | 'order_restored'
  | 'bribe_accepted' | 'opposition_funded' | 'invasion_repelled'
  | 'war_won' | 'shameful_peace' | 'target_unavailable' | 'fizzled';

// Исход арки: либо ключ из таблицы 7.7, либо свободный текст (например,
// итог кастомной арки из dynamicEvent — это текст LLM на языке рана).
export type ArcOutcome = ArcOutcomeKey | { k: 'text'; text: string };

// Однострочная запись истории. Параметры — нейтральные ключи (id соседа,
// id арки, числа) или уже готовый текст LLM (summary, названия кастомных арок).
export type ChronicleEntry =
  | { k: 'action'; summary: string }
  | { k: 'baseEvent'; id: string }
  | { k: 'dynamicEvent'; title: string; description: string }
  | { k: 'newArc'; title: string }
  // Поля arc/title/warTarget дублируют арку: у жёстких арок title пуст, итоговый
  // заголовок рендерер восстанавливает по arc (+warTarget для войны).
  | { k: 'arcProgress'; arc: string; title: string; warTarget: string | null; eventTitle: string }
  | { k: 'arcBackground'; arc: string; title: string; warTarget: string | null; eventTitle: string }
  | { k: 'arcFinished'; arc: string; title: string; warTarget: string | null; outcome: ArcOutcome }
  | { k: 'crisisStarted'; arc: string; neighbor: string | null }
  | { k: 'amnesty'; floor: number }
  | { k: 'gameOver'; reason: EndingReason }
  | { k: 'coupUltimatum' }
  | { k: 'protestsClashes' }
  | { k: 'civilWar' }
  | { k: 'housingBubbleBurst' }
  | { k: 'warAccepted'; neighbor: string }
  | { k: 'warRejected'; neighbor: string }
  | { k: 'warFailed' }
  | { k: 'oligarchsOffer' }
  | { k: 'invasionUltimatum'; neighbor: string };

// Лимит — последние N записей, старые схлопываются в сводный счётчик.
// Старые сейвы (7.10) могут держать в хронике plain-строки — рендерер
// пропускает их как есть.
export function pushChronicle(state: GameState, entry: ChronicleEntry): void {
  state.chronicle.push(entry);
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
// Роль может быть пустой — тогда слой локализации подставит «неизвестная роль».
export function addCharacter(state: GameState, name: string, role: string): Character | null {
  const trimmed = name.trim();
  if (!trimmed || findCharacter(state, trimmed)) return null;
  const character: Character = { name: trimmed, role: role.trim(), attitude: 0, alive: true };
  state.characters.push(character);
  return character;
}
