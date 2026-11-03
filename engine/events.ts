// Базовые ивенты (7.8): эффекты фиксированы в конфиге и применяет ДВИЖОК.
// LLM получает выпавший ивент и переписывает только название/описание (flavor).

import {
  CONFIG, MOOD_KEYS,
  type MoodBand, type MoodKey, type StatKey,
} from './config.js';
import {
  addMoodDelta, addStatDelta, addTreasury, bandIndex, bandOf,
  type GameState,
} from './state.js';
import { pushChronicle } from './chronicle.js';

export interface EventCondition {
  readonly stat?: StatKey;
  readonly derived?: 'homelessness';
  readonly above?: number;
  readonly below?: number;
  readonly moodBandAtMost?: { readonly key: MoodKey; readonly band: MoodBand };
}

export interface EventWhen {
  readonly any?: readonly EventCondition[];
  readonly all?: readonly EventCondition[];
  readonly anyBandAtLeast?: MoodBand;
}

export interface BaseEventEffects {
  readonly stats?: { readonly [K in StatKey]?: number };
  readonly mood?: { readonly [K in MoodKey]?: number };
  readonly moodAll?: number;
  readonly treasury?: number;
  readonly ifTreasuryNegativeMoodAll?: number;
}

export interface BaseEventDef {
  readonly id: string; // отображаемое название — в i18n.ts (BASE_EVENT_TITLES)
  readonly when?: EventWhen;
  readonly effects: BaseEventEffects;
}

export const BASE_EVENTS: readonly BaseEventDef[] = CONFIG.baseEvents;

function checkCondition(state: GameState, c: EventCondition): boolean {
  if (c.stat !== undefined) {
    const v = state.stats[c.stat];
    if (c.above !== undefined && !(v > c.above)) return false;
    if (c.below !== undefined && !(v < c.below)) return false;
    return true;
  }
  if (c.derived === 'homelessness') {
    const v = state.homelessness;
    if (c.above !== undefined && !(v > c.above)) return false;
    if (c.below !== undefined && !(v < c.below)) return false;
    return true;
  }
  if (c.moodBandAtMost) {
    return bandIndex(bandOf(state.mood[c.moodBandAtMost.key])) <= bandIndex(c.moodBandAtMost.band);
  }
  return true;
}

// Условия из скобок в таблице 7.8: ивент выпадает только при их выполнении.
export function eventEligible(state: GameState, def: BaseEventDef): boolean {
  const when = def.when;
  if (!when) return true;
  if (when.anyBandAtLeast) {
    const idx = bandIndex(when.anyBandAtLeast);
    if (!MOOD_KEYS.some((k) => bandIndex(bandOf(state.mood[k])) >= idx)) return false;
  }
  if (when.all && !when.all.every((c) => checkCondition(state, c))) return false;
  if (when.any && !when.any.some((c) => checkCondition(state, c))) return false;
  return true;
}

export function eligibleEvents(state: GameState): BaseEventDef[] {
  return BASE_EVENTS.filter((d) => eventEligible(state, d));
}

// Применение фиксированных эффектов. Никакого LLM здесь.
export function applyBaseEvent(state: GameState, def: BaseEventDef): void {
  const e = def.effects;
  if (e.stats) {
    for (const [k, v] of Object.entries(e.stats)) addStatDelta(state, k as StatKey, v ?? 0);
  }
  if (e.treasury) addTreasury(state, e.treasury);
  if (e.moodAll) {
    for (const k of MOOD_KEYS) addMoodDelta(state, k, e.moodAll);
  }
  if (e.mood) {
    for (const [k, v] of Object.entries(e.mood)) addMoodDelta(state, k as MoodKey, v ?? 0);
  }
  if (e.ifTreasuryNegativeMoodAll !== undefined && state.treasury < 0) {
    for (const k of MOOD_KEYS) addMoodDelta(state, k, e.ifTreasuryNegativeMoodAll);
  }
  state.counters.baseEvents += 1;
  pushChronicle(state, { k: 'baseEvent', id: def.id });
}
