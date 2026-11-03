// Кризисные триггеры и сюжетные арки (7.7). Арка продвигается раз за ход.
// Действие с actionType "war" стартует offensive_war вместо applyEffects.
// Движок языка не знает (закон 2): вместо готовых строк он отдаёт ключи
// сообщений (HappeningMsg / ChronicleEntry), которые рендерятся в i18n.ts.

import { CONFIG, MOOD_KEYS, clamp } from './config.js';
import {
  addMoodDelta, addStatDelta, addTreasury, avgMood, bandAtMost, bandIndex, bandOf,
  finishArc, makeArc, setGameOver, applyAction, applyImpeachmentAmnesty,
  type ArcState, type GameState,
} from './state.js';
import { pushChronicle } from './chronicle.js';
import type { EndingReason } from './score.js';
import type { ParsedAction } from './validator.js';

// Сообщение для игрока о ходе арки: ключ + нейтральные параметры
// (id соседа, заголовок кастомной арки).
export type HappeningMsg =
  | { k: 'coupUltimatum' }
  | { k: 'coupSuppressed' }
  | { k: 'protestsCalmed' }
  | { k: 'protestsClashes' }
  | { k: 'civilWarBegins' }
  | { k: 'civilWarConsumed' }
  | { k: 'protestsOrderRestored' }
  | { k: 'oligarchsBribe' }
  | { k: 'oligarchsOpposition' }
  | { k: 'oligarchsOffer' }
  | { k: 'invasionUltimatum'; neighbor: string }
  | { k: 'invasionRepelled'; neighbor: string }
  | { k: 'invasionSurrender'; neighbor: string }
  | { k: 'warStalemate'; neighbor: string }
  | { k: 'warVictory'; neighbor: string }
  | { k: 'warDefeat'; neighbor: string }
  | { k: 'warContinues'; neighbor: string }
  | { k: 'arcFizzled'; title: string }
  | { k: 'gameOver'; reason: EndingReason };

export interface ArcHappening {
  arcId: string;
  kind: 'stage' | 'endArc' | 'gameOver' | 'custom';
  msg: HappeningMsg;
}

interface HardTriggerDef {
  id: 'coup' | 'protests' | 'oligarchs' | 'invasion';
  check: (state: GameState) => boolean;
  force?: (state: GameState) => boolean; // форс-старт со стадии 2
}

// Условия старта по 7.7. Названия жёстких арок для игрока — в i18n.ts.
export const HARD_TRIGGERS: readonly HardTriggerDef[] = [
  {
    id: 'coup',
    // band(military) <= disliking И avgMood <= 40
    check: (s) => bandAtMost(s.mood.military, 'disliking') && avgMood(s) <= CONFIG.arcs.coup.avgMoodMax,
    force: (s) => bandOf(s.mood.military) === 'impeachment',
  },
  {
    id: 'protests',
    // (workers И/ИЛИ youth в disliking или ниже) И (freedom < 50 ИЛИ homelessness > 25)
    check: (s) =>
      (bandAtMost(s.mood.workers, 'disliking') || bandAtMost(s.mood.youth, 'disliking'))
      && (s.stats.freedom < CONFIG.arcs.protests.freedomBelow
        || s.homelessness > CONFIG.arcs.protests.homelessnessAbove),
    force: (s) => bandOf(s.mood.workers) === 'impeachment' || bandOf(s.mood.youth) === 'impeachment',
  },
  {
    id: 'oligarchs',
    check: (s) => s.stats.corruption > CONFIG.arcs.oligarchs.corruptionAbove
      && s.stats.economy > CONFIG.arcs.oligarchs.economyAbove,
  },
  {
    id: 'invasion',
    // у соседа: strength > 1.5 * (50 + pc/2) И relations < −40 И stability < 45
    check: (s) => s.neighbors.some((n) =>
      n.strength > CONFIG.arcs.invasion.strengthCoef
        * (CONFIG.arcs.invasion.baseDefense + s.stats.powerConcentration * CONFIG.arcs.invasion.pcCoef)
      && n.relations < CONFIG.arcs.invasion.relationsBelow
      && s.stats.stability < CONFIG.arcs.invasion.stabilityBelow),
  },
];

function startHardArc(state: GameState, id: string, forced: boolean, target: string | null): ArcState {
  const arc = makeArc(state, {
    id,
    title: '',
    kind: 'hard',
    stage: forced ? 2 : 0,
    forceStarted: forced,
    warTarget: target,
  });
  pushChronicle(state, { k: 'crisisStarted', arc: id, neighbor: target });
  return arc;
}

// Проверка старта арок. Лимиты: maxNewHardArcsPerTurn за ход, maxActiveArcs всего.
export function checkArcTriggers(state: GameState, newThisTurn: boolean): ArcState | null {
  if (state.gameOver) return null;
  if (newThisTurn) return null; // максимум 1 новая жёсткая арка за ход
  if (state.arcs.length >= CONFIG.run.maxActiveArcs) return null;
  for (const def of HARD_TRIGGERS) {
    if (state.arcs.some((a) => a.id === def.id)) continue;
    const forced = def.force ? def.force(state) : false;
    if (!forced && !def.check(state)) continue;
    let target: string | null = null;
    if (def.id === 'invasion') {
      const cfg = CONFIG.arcs.invasion;
      const n = state.neighbors.find((x) =>
        x.strength > cfg.strengthCoef * (cfg.baseDefense + state.stats.powerConcentration * cfg.pcCoef)
        && x.relations < cfg.relationsBelow
        && state.stats.stability < cfg.stabilityBelow);
      target = n?.id ?? null;
    }
    const arc = startHardArc(state, def.id, forced, target);
    if (def.id === 'coup' && forced) {
      // форс-старт — мгновенный game over, права на мирный исход нет
      resolveCoup(state, arc, []);
    }
    return arc;
  }
  return null;
}

// Война по инициативе игрока — только через actionType "war" (7.7).
// targetId — id соседа; свободный текст игрока/LLM в id разрешает UI-слой.
export function startOffensiveWar(state: GameState, targetId: string | null): ArcState | null {
  const t = CONFIG.arcs.offensiveWar;
  const q = (targetId ?? '').trim().toLowerCase();
  const target = state.neighbors.find((n) => n.id.toLowerCase() === q)
    ?? state.neighbors.find((n) => q.length > 2 && n.id.toLowerCase().includes(q));
  if (!target) return null;

  // проверка оправдания
  const justification = state.stats.warMood
    + (100 - state.stats.education) * t.eduCoef
    + state.stats.powerConcentration * t.pcCoef;
  if (justification >= t.justificationThreshold) {
    addStatDelta(state, 'warMood', t.acceptedWarMood);
    addMoodDelta(state, 'military', t.acceptedMilitaryMood);
    pushChronicle(state, { k: 'warAccepted', neighbor: target.id });
  } else {
    addStatDelta(state, 'stability', t.rejectedStability);
    addMoodDelta(state, 'youth', t.rejectedYouthMood);
    addMoodDelta(state, 'workers', t.rejectedWorkersMood);
    addStatDelta(state, 'warMood', t.rejectedWarMood);
    pushChronicle(state, { k: 'warRejected', neighbor: target.id });
  }
  return startHardArc(state, 'offensive_war', false, target.id);
}

export type ActionOutcome = { kind: 'effects'; amnestyApplied: boolean } | { kind: 'war'; arc: ArcState | null };

// Маршрутизация действия: война — в арку, остальное — эффекты (+ примирение).
export function executeAction(state: GameState, action: ParsedAction): ActionOutcome {
  if (action.actionType === 'war') {
    const arc = startOffensiveWar(state, action.warTarget);
    if (!arc) pushChronicle(state, { k: 'warFailed' });
    // действие засчитывается (абсурд, идеология), но эффекты не применяются
    state.absurdityTotal += action.absurdity;
    state.actionsCount += 1;
    for (const tag of action.ideologyTags) state.ideology[tag] = (state.ideology[tag] ?? 0) + 1;
    state.counters.actions += 1;
    return { kind: 'war', arc };
  }
  applyAction(state, action);
  const amnestyApplied = action.impeachmentAmnesty ? applyImpeachmentAmnesty(state) : false;
  return { kind: 'effects', amnestyApplied };
}

// Продвижение всех активных арок на один ход.
export function advanceArcs(state: GameState, skipIds: ReadonlySet<string> = new Set()): ArcHappening[] {
  const out: ArcHappening[] = [];
  for (const arc of [...state.arcs]) {
    if (state.gameOver) break;
    if (skipIds.has(arc.id)) continue;
    if (arc.kind === 'custom') {
      // кастомная арка без продолжений таймаутится
      if (state.week - arc.lastUpdateWeek > CONFIG.run.customArcTimeoutWeeks) {
        finishArc(state, arc, 'fizzled');
        // новость вместо молчаливого исхода: скандал должен «выдохнуться» на глазах у игрока
        out.push({
          arcId: arc.id,
          kind: 'custom',
          msg: { k: 'arcFizzled', title: arc.title },
        });
      }
      continue;
    }
    advanceHardArc(state, arc, out);
  }
  return out;
}

function advanceHardArc(state: GameState, arc: ArcState, out: ArcHappening[]): void {
  arc.turns += 1;
  switch (arc.id) {
    case 'coup': advanceCoup(state, arc, out); break;
    case 'protests': advanceProtests(state, arc, out); break;
    case 'oligarchs': advanceOligarchs(state, arc, out); break;
    case 'invasion': advanceInvasion(state, arc, out); break;
    case 'offensive_war': advanceOffensiveWar(state, arc, out); break;
  }
}

// coup: стадия 0 слухи → стадия 1 ультиматум → стадия 2 развязка.
function advanceCoup(state: GameState, arc: ArcState, out: ArcHappening[]): void {
  if (arc.stage === 0) {
    arc.stage = 1;
    pushChronicle(state, { k: 'coupUltimatum' });
    out.push({ arcId: arc.id, kind: 'stage', msg: { k: 'coupUltimatum' } });
    return;
  }
  resolveCoup(state, arc, out);
}

function resolveCoup(state: GameState, arc: ArcState, out: ArcHappening[]): void {
  const c = CONFIG.arcs.coup;
  if (arc.forceStarted) {
    setGameOver(state, 'overthrown', { k: 'coup' });
    out.push({ arcId: arc.id, kind: 'gameOver', msg: { k: 'gameOver', reason: { k: 'coup' } } });
    return;
  }
  if (state.mood.military * c.militaryMoodCoef + state.stats.powerConcentration * c.pcCoef > c.moodMax) {
    finishArc(state, arc, 'coup_suppressed');
    out.push({ arcId: arc.id, kind: 'endArc', msg: { k: 'coupSuppressed' } });
  } else {
    setGameOver(state, 'overthrown', { k: 'coup' });
    out.push({ arcId: arc.id, kind: 'gameOver', msg: { k: 'gameOver', reason: { k: 'coup' } } });
  }
}

// protests: мирное гашение → стадия 1 столкновения → стадия 2 гражданская война.
function advanceProtests(state: GameState, arc: ArcState, out: ArcHappening[]): void {
  const p = CONFIG.arcs.protests;
  const calm = bandIndex(bandOf(state.mood.workers)) >= bandIndex('neutral')
    && bandIndex(bandOf(state.mood.youth)) >= bandIndex('neutral');
  if (!arc.forceStarted && calm) {
    finishArc(state, arc, 'protests_calm');
    out.push({ arcId: arc.id, kind: 'endArc', msg: { k: 'protestsCalmed' } });
    return;
  }
  if (arc.stage === 0) {
    arc.stage = 1;
    addStatDelta(state, 'stability', p.stageStability);
    pushChronicle(state, { k: 'protestsClashes' });
    out.push({ arcId: arc.id, kind: 'stage', msg: { k: 'protestsClashes' } });
    return;
  }
  if (arc.stage === 1) {
    addStatDelta(state, 'stability', p.stageStability);
    if (state.stats.stability < p.civilWarStabilityBelow) {
      arc.stage = 2;
      pushChronicle(state, { k: 'civilWar' });
      out.push({ arcId: arc.id, kind: 'stage', msg: { k: 'civilWarBegins' } });
    }
    return;
  }
  // гражданская война: каждый ход казна −10, economy −5
  addTreasury(state, -p.warTreasuryDrain);
  addStatDelta(state, 'economy', p.warEconomyDrain);
  if (state.treasury < p.loseTreasuryBelow
    || state.mood.military * p.loseMilitaryCoef + state.treasury * p.loseTreasuryCoef < p.loseThreshold) {
    setGameOver(state, 'collapsed', { k: 'civil_war' });
    out.push({ arcId: arc.id, kind: 'gameOver', msg: { k: 'gameOver', reason: { k: 'civil_war' } } });
    return;
  }
  if (state.stats.stability > p.winStabilityAbove) {
    finishArc(state, arc, 'order_restored');
    out.push({ arcId: arc.id, kind: 'endArc', msg: { k: 'protestsOrderRestored' } });
  }
}

// oligarchs: взятка при высокой коррупции, оппозиция при недолюбливающих элитах.
function advanceOligarchs(state: GameState, arc: ArcState, out: ArcHappening[]): void {
  const o = CONFIG.arcs.oligarchs;
  if (state.stats.corruption > o.bribeCorruptionAbove) {
    addTreasury(state, o.bribeTreasury);
    addMoodDelta(state, 'elites', o.bribeElitesMood);
    addMoodDelta(state, 'workers', o.bribeWorkersMood);
    finishArc(state, arc, 'bribe_accepted');
    out.push({ arcId: arc.id, kind: 'endArc', msg: { k: 'oligarchsBribe' } });
    return;
  }
  if (bandAtMost(state.mood.elites, 'disliking')) {
    finishArc(state, arc, 'opposition_funded');
    out.push({ arcId: arc.id, kind: 'endArc', msg: { k: 'oligarchsOpposition' } });
    return;
  }
  if (arc.stage === 0) {
    arc.stage = 1;
    pushChronicle(state, { k: 'oligarchsOffer' });
    out.push({ arcId: arc.id, kind: 'stage', msg: { k: 'oligarchsOffer' } });
  }
}

// invasion: ультиматум → развязка по обороноспособности.
function advanceInvasion(state: GameState, arc: ArcState, out: ArcHappening[]): void {
  const inv = CONFIG.arcs.invasion;
  const target = state.neighbors.find((n) => n.id === arc.warTarget) ?? state.neighbors[0];
  if (arc.stage === 0) {
    arc.stage = 1;
    pushChronicle(state, { k: 'invasionUltimatum', neighbor: target.id });
    out.push({ arcId: arc.id, kind: 'stage', msg: { k: 'invasionUltimatum', neighbor: target.id } });
    return;
  }
  let defense = state.mood.military + state.stats.stability
    + state.stats.warMood * inv.defenseWarMoodCoef;
  if (state.stats.warMood < inv.warMoodLowBelow) defense += inv.warMoodPenalty;
  if (defense > target.strength) {
    target.relations = clamp(target.relations + inv.winRelations, CONFIG.neighborRelationsScale.min, CONFIG.neighborRelationsScale.max);
    addStatDelta(state, 'warMood', inv.winWarMood);
    finishArc(state, arc, 'invasion_repelled');
    out.push({ arcId: arc.id, kind: 'endArc', msg: { k: 'invasionRepelled', neighbor: target.id } });
  } else {
    setGameOver(state, 'collapsed', { k: 'invasion', neighbor: target.id });
    out.push({ arcId: arc.id, kind: 'gameOver', msg: { k: 'gameOver', reason: { k: 'invasion', neighbor: target.id } } });
  }
}

// offensive_war: еженедельные потери, развязка со 2-го хода войны.
function advanceOffensiveWar(state: GameState, arc: ArcState, out: ArcHappening[]): void {
  const w = CONFIG.arcs.offensiveWar;
  const target = state.neighbors.find((n) => n.id === arc.warTarget);
  if (!target) { // сосед исчез — закрываем арку без последствий
    finishArc(state, arc, 'target_unavailable');
    return;
  }
  addTreasury(state, -w.turnTreasuryDrain);
  addStatDelta(state, 'economy', w.turnEconomyDrain);
  for (const n of state.neighbors) {
    if (n.id !== target.id) {
      n.relations = clamp(n.relations + w.otherNeighborsRelations, CONFIG.neighborRelationsScale.min, CONFIG.neighborRelationsScale.max);
    }
  }
  if (arc.turns < 2) {
    out.push({ arcId: arc.id, kind: 'stage', msg: { k: 'warStalemate', neighbor: target.id } });
    return;
  }
  const attack = state.mood.military * w.attackMilitaryCoef
    + state.stats.warMood * w.attackWarMoodCoef
    + state.stats.technology * w.attackTechCoef
    + Math.max(0, state.treasury) * w.attackTreasuryCoef;
  if (attack > target.strength) {
    addTreasury(state, w.winTreasury);
    addStatDelta(state, 'warMood', w.winWarMood);
    addStatDelta(state, 'powerConcentration', w.winPc);
    for (const n of state.neighbors) {
      n.relations = clamp(n.relations + w.winRelations, CONFIG.neighborRelationsScale.min, CONFIG.neighborRelationsScale.max);
    }
    finishArc(state, arc, 'war_won');
    out.push({ arcId: arc.id, kind: 'endArc', msg: { k: 'warVictory', neighbor: target.id } });
  } else if (state.treasury < w.loseTreasuryBelow || attack < target.strength * w.loseStrengthCoef) {
    addTreasury(state, w.loseTreasury);
    addStatDelta(state, 'warMood', -state.stats.warMood); // warMood = 0
    for (const k of MOOD_KEYS) addMoodDelta(state, k, w.loseMoodAll);
    finishArc(state, arc, 'shameful_peace');
    out.push({ arcId: arc.id, kind: 'endArc', msg: { k: 'warDefeat', neighbor: target.id } });
  } else {
    out.push({ arcId: arc.id, kind: 'stage', msg: { k: 'warContinues', neighbor: target.id } });
  }
}
