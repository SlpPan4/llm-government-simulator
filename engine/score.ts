// Концовки и итоговый счёт (7.9).

import { CONFIG, MOOD_KEYS, clamp, type GameMode } from './config.js';
import { avgMood, bandAtMost, bandOf, type GameState } from './state.js';

export type EndingId = 'peaceful_handover' | 'reelected' | 'for_life' | 'overthrown' | 'collapsed';

// Причина концовки от движка — нейтральный ключ (закон 2): подписи концовок
// и тексты причин для игрока живут в i18n.ts (finale.endingLabels/desc*).
// neighbor — id соседа, не отображаемое имя.
export type EndingReason =
  | { k: 'reelected_clean' }
  | { k: 'reelected_willful' }
  | { k: 'handover' }
  | { k: 'coup' }
  | { k: 'civil_war' }
  | { k: 'invasion'; neighbor: string };

// Описание концовки: ключ причины от движка либо готовый текст (например,
// от UI-слоя: отставка, попытка остаться у власти).
export type EndingDescription = EndingReason | { k: 'text'; text: string };

export interface EndingResult {
  id: EndingId;
  multiplier: number;
  description: EndingDescription;
}

export function makeEnding(id: EndingId, description: EndingDescription): EndingResult {
  const multKey = id === 'reelected' ? 'reelected' : id;
  return {
    id,
    multiplier: CONFIG.endings.multipliers[multKey as keyof typeof CONFIG.endings.multipliers] as number,
    description,
  };
}

// Средний абсурд рана: absurdityTotal / actionsCount (0, если действий не было).
export function avgAbsurdity(state: GameState): number {
  return state.actionsCount === 0 ? 0 : state.absurdityTotal / state.actionsCount;
}

// Модификатор абсурда: бонус в креативизме, мягкий штраф в реализме выше 35.
export function absurdityMod(mode: GameMode, avg: number): number {
  const sc = CONFIG.score;
  if (mode === 'creative') {
    return 1 + (avg / CONFIG.absurdity.max) * sc.creativeAbsurdCoef;
  }
  if (avg <= sc.realismAbsurdFree) return 1;
  return 1 - ((avg - sc.realismAbsurdFree) / sc.realismAbsurdRange) * sc.realismAbsurdPenalty;
}

// База счёта по формуле 7.9.
export function computeBase(state: GameState): number {
  const s = state.stats;
  const sc = CONFIG.score;
  const top = CONFIG.statScale.max;
  return s.economy * sc.economyCoef
    + (top - s.poverty) * sc.povertyCoef
    + (top - s.unemployment * sc.unemploymentCoef)
    + s.freedom * sc.freedomCoef
    + s.stability * sc.stabilityCoef
    + (top - s.corruption) * sc.corruptionCoef
    + s.education * sc.educationCoef
    + s.technology * sc.technologyCoef
    + s.warMood * sc.warMoodCoef
    + clamp(state.treasury, 0, sc.clampTreasuryMax) * sc.treasuryCoef;
}

export interface ScoreBreakdown {
  base: number;
  endingMult: number;
  absurdityMod: number;
  total: number;
}

// Итог: base / 6.75 × множитель концовки × модификатор абсурда, округление.
export function computeScore(state: GameState, ending: EndingResult): ScoreBreakdown {
  const base = computeBase(state);
  const mod = absurdityMod(state.mode, avgAbsurdity(state));
  const total = Math.round((base / CONFIG.score.baseDiv) * ending.multiplier * mod);
  return { base, endingMult: ending.multiplier, absurdityMod: mod, total };
}

// ─── Конец срока (7.9) ───

// Попытка «остаться у власти» автоматически проваливается при импичменте
// любой группы или военных в поясе hatred и ниже.
export function stayAttemptAutoFails(state: GameState): boolean {
  return MOOD_KEYS.some((k) => bandOf(state.mood[k]) === 'impeachment')
    || bandAtMost(state.mood.military, 'hatred');
}

// powerConcentration + military*0.5 − (100−stability)*0.5 > 90
export function stayAttemptSuccess(state: GameState): boolean {
  const e = CONFIG.endings;
  return state.stats.powerConcentration + state.mood.military * e.militaryHalfCoef
    - (CONFIG.statScale.max - state.stats.stability) * e.stabilityHalfCoef > e.stayFormulaThreshold;
}

// Мирное завершение срока без попытки остаться.
export function resolveTermEnding(state: GameState): EndingResult {
  const e = CONFIG.endings;
  const avg = avgMood(state);
  if (avg >= e.reelectAvgMood) {
    return makeEnding('reelected', { k: 'reelected_clean' });
  }
  if (avg >= e.willfulAvgMood && state.stats.stability > e.willfulStability) {
    const ending = makeEnding('reelected', { k: 'reelected_willful' });
    ending.multiplier = CONFIG.endings.multipliers.reelected_willful;
    return ending;
  }
  return makeEnding('peaceful_handover', { k: 'handover' });
}

// Концовка при game over (арки/война).
export function endingFromGameOver(state: GameState): EndingResult {
  const info = state.gameOver;
  if (!info) return resolveTermEnding(state);
  return makeEnding(info.ending, info.reason);
}
