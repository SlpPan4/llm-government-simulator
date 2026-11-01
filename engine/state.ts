// Состояние игры и чистые операции над ним. Движок не знает о LLM.

import {
  CONFIG, clamp,
  STAT_KEYS, MOOD_KEYS,
  type GameMode, type IdeologyTag, type MoodBand, type MoodKey, type StatKey,
} from './config.js';
import { pushChronicle, addCharacter, findCharacter } from './chronicle.js';
import type { ParsedAction, ValidatedDynamicEvent } from './validator.js';

export interface NeighborState {
  name: string;
  strength: number;
  relations: number;
}

export interface Character {
  name: string;
  role: string;
  attitude: number; // −100..100
  alive: boolean;
}

export interface ArcState {
  id: string; // 'coup' | 'protests' | '...' или slug кастомной арки
  title: string;
  kind: 'hard' | 'custom';
  stage: number;
  turns: number; // ходов с начала арки (для развязок «со 2-го хода»)
  startedWeek: number;
  lastUpdateWeek: number; // для таймаута кастомных арок
  forceStarted: boolean;
  warTarget: string | null; // имя соседа для войн
  description: string;
}

export interface FinishedArc {
  id: string;
  title: string;
  outcome: string;
}

export interface GameOverInfo {
  ending: 'overthrown' | 'collapsed';
  reason: string;
}

export interface RunCounters {
  actions: number;
  baseEvents: number;
  dynamicEvents: number;
  arcsFinished: number;
}

export interface GameState {
  mode: GameMode;
  countryName: string;
  week: number; // 1..termWeeks
  stats: Record<StatKey, number>;
  mood: Record<MoodKey, number>;
  treasury: number;
  neighbors: NeighborState[];
  housingBubble: number;
  homelessness: number;
  population: number;
  populationStart: number;
  prevHomelessness: number; // для стрелок динамики в панели
  prevPopulation: number;
  absurdityTotal: number;
  actionsCount: number;
  ideology: Partial<Record<IdeologyTag, number>>;
  impeachmentFrozen: Record<MoodKey, boolean>; // снимается только новым раном
  arcs: ArcState[];
  finishedArcs: FinishedArc[];
  chronicle: string[];
  chronicleCollapsed: number;
  counters: RunCounters;
  characters: Character[];
  lastDynamicEventWeek: number;
  gameOver: GameOverInfo | null;
}

export function createInitialState(mode: GameMode, countryName: string): GameState {
  const stats = {} as Record<StatKey, number>;
  for (const k of STAT_KEYS) stats[k] = CONFIG.stats[k].start;
  const mood = {} as Record<MoodKey, number>;
  for (const k of MOOD_KEYS) mood[k] = CONFIG.moods[k].start;
  return {
    mode,
    countryName,
    week: 1,
    stats,
    mood,
    treasury: CONFIG.run.startTreasury,
    neighbors: CONFIG.neighbors.map((n) => ({ ...n })),
    housingBubble: CONFIG.tick.housingBubble.start,
    homelessness: CONFIG.tick.homelessness.start,
    population: CONFIG.tick.population.start,
    populationStart: CONFIG.tick.population.start,
    prevHomelessness: CONFIG.tick.homelessness.start,
    prevPopulation: CONFIG.tick.population.start,
    absurdityTotal: 0,
    actionsCount: 0,
    ideology: {},
    impeachmentFrozen: { elites: false, military: false, workers: false, youth: false },
    arcs: [],
    finishedArcs: [],
    chronicle: [],
    chronicleCollapsed: 0,
    counters: { actions: 0, baseEvents: 0, dynamicEvents: 0, arcsFinished: 0 },
    characters: [],
    lastDynamicEventWeek: -CONFIG.run.dynamicEventCooldownWeeks,
    gameOver: null,
  };
}

// ─── Пояса настроений (7.2) ───

export function bandOf(value: number): MoodBand {
  const v = clamp(value, CONFIG.statScale.min, CONFIG.statScale.max);
  for (const b of CONFIG.moodBands) {
    if (v >= b.min && v <= b.max) return b.band;
  }
  return 'neutral';
}

export function bandIndex(band: MoodBand): number {
  return CONFIG.moodBands.findIndex((b) => b.band === band);
}

export function bandLabel(band: MoodBand): string {
  return CONFIG.moodBands.find((b) => b.band === band)?.label ?? band;
}

// «в поясе band или ниже»
export function bandAtMost(value: number, band: MoodBand): boolean {
  return bandIndex(bandOf(value)) <= bandIndex(band);
}

export function avgMood(state: GameState): number {
  let sum = 0;
  for (const k of MOOD_KEYS) sum += state.mood[k];
  return sum / MOOD_KEYS.length;
}

// Средний множитель роста экономики по поясам всех групп (7.5).
export function growthMult(state: GameState): number {
  let sum = 0;
  for (const k of MOOD_KEYS) {
    const b = CONFIG.moodBands.find((x) => x.band === bandOf(state.mood[k]));
    sum += b ? b.growthMult : 1;
  }
  return sum / MOOD_KEYS.length;
}

// Усилитель реакции населения (7.5).
export function reactionAmp(state: GameState): number {
  return CONFIG.tick.reactionBase + state.stats.education / CONFIG.tick.reactionEduDiv;
}

// ─── Применение дельт ───

export function clampStat(v: number): number {
  return clamp(v, CONFIG.statScale.min, CONFIG.statScale.max);
}

export function addStatDelta(state: GameState, key: StatKey, delta: number): void {
  if (!Number.isFinite(delta) || delta === 0) return;
  state.stats[key] = clampStat(state.stats[key] + delta);
}

export function addTreasury(state: GameState, delta: number): void {
  if (!Number.isFinite(delta) || delta === 0) return;
  state.treasury += delta;
}

// Дельта mood: reactionAmp, смягчение падения по поясу, заморозка импичмента.
export function addMoodDelta(state: GameState, key: MoodKey, delta: number): void {
  if (!Number.isFinite(delta) || delta === 0) return;
  if ((state.impeachmentFrozen[key] || bandOf(state.mood[key]) === 'impeachment') && delta > 0) {
    return; // импичмент: только падать или стоять
  }
  let d = delta * reactionAmp(state);
  const band = bandOf(state.mood[key]);
  if (d < 0) {
    if (band === 'love') d *= CONFIG.tick.loveFallMult;
    else if (band === 'positive') d *= CONFIG.tick.positiveFallMult;
  }
  state.mood[key] = clamp(state.mood[key] + d, CONFIG.statScale.min, CONFIG.statScale.max);
  if (state.mood[key] <= CONFIG.moodBands[0].max) state.impeachmentFrozen[key] = true;
}

// ─── Арки (низкоуровневые операции) ───

export function makeArc(
  state: GameState,
  init: Pick<ArcState, 'id' | 'title' | 'kind'> & Partial<ArcState>,
): ArcState {
  const arc: ArcState = {
    stage: 0,
    turns: 0,
    startedWeek: state.week,
    lastUpdateWeek: state.week,
    forceStarted: false,
    warTarget: null,
    description: '',
    ...init,
  };
  state.arcs.push(arc);
  return arc;
}

export function finishArc(state: GameState, arc: ArcState, outcome: string): void {
  state.arcs = state.arcs.filter((a) => a !== arc);
  state.finishedArcs.push({ id: arc.id, title: arc.title, outcome });
  state.counters.arcsFinished += 1;
  pushChronicle(state, `Арка «${arc.title}» завершена: ${outcome}`);
}

export function setGameOver(state: GameState, ending: 'overthrown' | 'collapsed', reason: string): void {
  state.gameOver = { ending, reason };
  pushChronicle(state, `Конец правления: ${reason}`);
}

// ─── Действия и события ───

function countAction(state: GameState, action: ParsedAction): void {
  state.absurdityTotal += action.absurdity;
  state.actionsCount += 1;
  for (const tag of action.ideologyTags) {
    state.ideology[tag] = (state.ideology[tag] ?? 0) + 1;
  }
  state.counters.actions += 1;
}

// Применяет валидированные эффекты действия (не для войны).
export function applyAction(state: GameState, action: ParsedAction): void {
  for (const [k, v] of Object.entries(action.effects)) addStatDelta(state, k as StatKey, v);
  for (const [k, v] of Object.entries(action.mood)) addMoodDelta(state, k as MoodKey, v);
  addTreasury(state, action.treasuryDelta);
  countAction(state, action);
  pushChronicle(state, `Действие: ${action.summary}`);
}

// Динамическое событие: эффекты + персонажи + кастомные арки (7.8.1).
export function applyDynamicEvent(state: GameState, evt: ValidatedDynamicEvent): void {
  for (const [k, v] of Object.entries(evt.effects)) addStatDelta(state, k as StatKey, v);
  for (const [k, v] of Object.entries(evt.mood)) addMoodDelta(state, k as MoodKey, v);
  addTreasury(state, evt.treasuryDelta);

  // не более одного нового персонажа за событие; существующие — по имени
  if (evt.newCharacter && !findCharacter(state, evt.newCharacter.name)) {
    addCharacter(state, evt.newCharacter.name, evt.newCharacter.role);
  }

  if (evt.newArc && !state.arcs.some((a) => a.id === evt.newArc) &&
      state.arcs.length < CONFIG.run.maxActiveArcs) {
    makeArc(state, { id: evt.newArc, title: evt.title, kind: 'custom', description: evt.description });
    pushChronicle(state, `📖 Открыта сюжетная арка «${evt.title}»`);
  }

  if (evt.parentArcId) {
    const parent = state.arcs.find((a) => a.id === evt.parentArcId);
    if (parent) {
      if (evt.resolvesArc) {
        finishArc(state, parent, evt.title);
      } else {
        parent.lastUpdateWeek = state.week;
        parent.turns += 1;
        pushChronicle(state, `Развитие арки «${parent.title}»: ${evt.title}`);
      }
    }
  }

  state.counters.dynamicEvents += 1;
  state.lastDynamicEventWeek = state.week;
  pushChronicle(state, `⚡ ${evt.title}: ${evt.description}`);
}

// Кулдаун динамических событий (7.3).
export function canHaveDynamicEvent(state: GameState): boolean {
  return state.week - state.lastDynamicEventWeek >= CONFIG.run.dynamicEventCooldownWeeks;
}

// Топ-3 идеологических тега — профиль режима (7.8.1).
export function ideologyProfile(state: GameState): IdeologyTag[] {
  return (Object.entries(state.ideology) as [IdeologyTag, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);
}
