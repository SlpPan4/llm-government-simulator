// Состояние игры и чистые операции над ним. Движок не знает о LLM.

import {
  CONFIG, clamp,
  STAT_KEYS, MOOD_KEYS,
  type GameMode, type IdeologyTag, type MoodBand, type MoodKey, type StatKey,
} from './config.js';
import {
  pushChronicle, addCharacter, findCharacter,
  type ArcOutcome, type ChronicleEntry,
} from './chronicle.js';
import type { EndingDescription, EndingReason } from './score.js';
import type { ParsedAction, ValidatedDynamicEvent } from './validator.js';

// Сосед идентифицируется стабильным id из конфига; отображаемое имя
// на языке рана даёт слой локализации (i18n.ts, NEIGHBOR_NAMES).
export interface NeighborState {
  id: string;
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
  // Заголовок только для кастомных арок (текст LLM на языке рана).
  // У жёстких арок пусто — название разрешается по id в слое локализации.
  title: string;
  kind: 'hard' | 'custom';
  stage: number;
  turns: number; // ходов с начала арки (для развязок «со 2-го хода»)
  startedWeek: number;
  lastUpdateWeek: number; // для таймаута кастомных арок
  forceStarted: boolean;
  warTarget: string | null; // id соседа для войн
  description: string;
}

export interface FinishedArc {
  id: string;
  title: string;
  outcome: ArcOutcome;
}

export interface GameOverInfo {
  ending: 'overthrown' | 'collapsed';
  reason: EndingDescription; // движок даёт ключ, UI-слой может подложить текст
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
  // World setting of the run: free text from the player, injected into every
  // LLM prompt. The engine never interprets it (texts only, no rule changes).
  setting: string;
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
  impeachmentFrozen: Record<MoodKey, boolean>; // снимается новым раном или примирением
  lastAmnestyWeek: number; // кулдаун «великого примирения»
  amnestyCount: number; // лимит применений за ран
  arcs: ArcState[];
  finishedArcs: FinishedArc[];
  // Структурированные записи (ключи сообщений); plain-строки — из старых сейвов.
  chronicle: Array<ChronicleEntry | string>;
  chronicleCollapsed: number;
  counters: RunCounters;
  characters: Character[];
  lastDynamicEventWeek: number;
  gameOver: GameOverInfo | null;
}

export function createInitialState(mode: GameMode, countryName: string, setting = ''): GameState {
  const stats = {} as Record<StatKey, number>;
  for (const k of STAT_KEYS) stats[k] = CONFIG.stats[k].start;
  const mood = {} as Record<MoodKey, number>;
  for (const k of MOOD_KEYS) mood[k] = CONFIG.moods[k].start;
  return {
    mode,
    countryName,
    setting,
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
    lastAmnestyWeek: -CONFIG.impeachmentAmnesty.cooldownWeeks, // первый жест доступен сразу
    amnestyCount: 0,
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

// «Великое примирение»: снятие заморозки импичмента ценой казны и стабильности.
// Вызывается, когда парсер LLM вернул impeachmentAmnesty: true (дорогой жест
// примирения); старые сейвы без полей счётчиков лечатся значениями по умолчанию.
export function applyImpeachmentAmnesty(state: GameState): boolean {
  const cfg = CONFIG.impeachmentAmnesty;
  if (!MOOD_KEYS.some((k) => state.impeachmentFrozen[k])) return false;
  if ((state.amnestyCount ?? 0) >= cfg.maxPerRun) return false;
  if (state.week - (state.lastAmnestyWeek ?? -cfg.cooldownWeeks) < cfg.cooldownWeeks) return false;
  for (const k of MOOD_KEYS) {
    if (state.impeachmentFrozen[k]) {
      state.impeachmentFrozen[k] = false;
      state.mood[k] = clamp(Math.max(state.mood[k], cfg.floor), CONFIG.statScale.min, CONFIG.statScale.max);
    }
  }
  addTreasury(state, -cfg.treasuryCost);
  addStatDelta(state, 'stability', -cfg.stabilityCost);
  state.amnestyCount = (state.amnestyCount ?? 0) + 1;
  state.lastAmnestyWeek = state.week;
  pushChronicle(state, { k: 'amnesty', floor: cfg.floor });
  return true;
}

// ─── Арки (низкоуровневые операции) ───

// id арок нормализуются движком: lowercase, всё кроме [a-zа-яё0-9] → «_» (7.8.1).
export function normalizeArcId(raw: string): string {
  return raw.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '_').replace(/^_+|_+$/g, '');
}

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

export function finishArc(state: GameState, arc: ArcState, outcome: ArcOutcome): void {
  state.arcs = state.arcs.filter((a) => a !== arc);
  state.finishedArcs.push({ id: arc.id, title: arc.title, outcome });
  state.counters.arcsFinished += 1;
  pushChronicle(state, { k: 'arcFinished', arc: arc.id, title: arc.title, warTarget: arc.warTarget, outcome });
}

export function setGameOver(
  state: GameState,
  ending: 'overthrown' | 'collapsed',
  reason: EndingReason,
): void {
  state.gameOver = { ending, reason };
  pushChronicle(state, { k: 'gameOver', reason });
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
  pushChronicle(state, { k: 'action', summary: action.summary });
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

  // Арка открывается через newArc, только если среди АКТИВНЫХ нет арки с тем же
  // названием (trim + lowercase). Иначе событие — продолжение существующей (7.8.1).
  let parentArcId = evt.parentArcId;
  if (evt.newArc) {
    const titleKey = evt.title.trim().toLowerCase();
    const existing = state.arcs.find((a) => a.title.trim().toLowerCase() === titleKey);
    if (existing) {
      parentArcId = existing.id;
    } else if (state.arcs.length < CONFIG.run.maxActiveArcs) {
      const id = normalizeArcId(evt.newArc) || normalizeArcId(evt.title);
      if (id && !state.arcs.some((a) => a.id === id)) {
        makeArc(state, { id, title: evt.title, kind: 'custom', description: evt.description });
        pushChronicle(state, { k: 'newArc', title: evt.title });
      }
    }
  }

  if (parentArcId) {
    const parent = state.arcs.find((a) => a.id === parentArcId);
    if (parent) {
      if (parent.kind === 'custom') {
        if (evt.resolvesArc) {
          finishArc(state, parent, { k: 'text', text: evt.title });
        } else {
          parent.lastUpdateWeek = state.week;
          parent.turns += 1;
          // любое продолжение повышает стадию на 1, потолок 5 (7.8.1)
          parent.stage = Math.min(parent.stage + 1, CONFIG.run.maxArcStage);
          pushChronicle(state, {
            k: 'arcProgress', arc: parent.id, title: parent.title,
            warTarget: parent.warTarget, eventTitle: evt.title,
          });
        }
      } else {
        // жёсткие арки разрешает только движок (7.7); LLM лишь анонсирует фон
        pushChronicle(state, {
          k: 'arcBackground', arc: parent.id, title: parent.title,
          warTarget: parent.warTarget, eventTitle: evt.title,
        });
      }
    }
  }

  state.counters.dynamicEvents += 1;
  state.lastDynamicEventWeek = state.week;
  pushChronicle(state, { k: 'dynamicEvent', title: evt.title, description: evt.description });
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
