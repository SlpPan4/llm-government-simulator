// Кризисные триггеры и сюжетные арки (7.7). Арка продвигается раз за ход.
// Действие с actionType "war" стартует offensive_war вместо applyEffects.

import { CONFIG, MOOD_KEYS, clamp } from './config.js';
import {
  addMoodDelta, addStatDelta, addTreasury, avgMood, bandAtMost, bandIndex, bandOf,
  finishArc, makeArc, setGameOver, applyAction, applyImpeachmentAmnesty,
  type ArcState, type GameState,
} from './state.js';
import { pushChronicle } from './chronicle.js';
import type { ParsedAction } from './validator.js';

export interface ArcHappening {
  arcId: string;
  title: string;
  text: string;
  kind: 'stage' | 'endArc' | 'gameOver' | 'custom';
}

interface HardTriggerDef {
  id: 'coup' | 'protests' | 'oligarchs' | 'invasion';
  title: string;
  check: (state: GameState) => boolean;
  force?: (state: GameState) => boolean; // форс-старт со стадии 2
}

// Условия старта по 7.7.
export const HARD_TRIGGERS: readonly HardTriggerDef[] = [
  {
    id: 'coup',
    title: 'Военный переворот',
    // band(military) <= disliking И avgMood <= 40
    check: (s) => bandAtMost(s.mood.military, 'disliking') && avgMood(s) <= CONFIG.arcs.coup.avgMoodMax,
    force: (s) => bandOf(s.mood.military) === 'impeachment',
  },
  {
    id: 'protests',
    title: 'Протесты → гражданская война',
    // (workers И/ИЛИ youth в disliking или ниже) И (freedom < 50 ИЛИ homelessness > 25)
    check: (s) =>
      (bandAtMost(s.mood.workers, 'disliking') || bandAtMost(s.mood.youth, 'disliking'))
      && (s.stats.freedom < CONFIG.arcs.protests.freedomBelow
        || s.homelessness > CONFIG.arcs.protests.homelessnessAbove),
    force: (s) => bandOf(s.mood.workers) === 'impeachment' || bandOf(s.mood.youth) === 'impeachment',
  },
  {
    id: 'oligarchs',
    title: 'Олигархи',
    check: (s) => s.stats.corruption > CONFIG.arcs.oligarchs.corruptionAbove
      && s.stats.economy > CONFIG.arcs.oligarchs.economyAbove,
  },
  {
    id: 'invasion',
    title: 'Вторжение соседа',
    // у соседа: strength > 1.5 * (50 + pc/2) И relations < −40 И stability < 45
    check: (s) => s.neighbors.some((n) =>
      n.strength > CONFIG.arcs.invasion.strengthCoef
        * (CONFIG.arcs.invasion.baseDefense + s.stats.powerConcentration * CONFIG.arcs.invasion.pcCoef)
      && n.relations < CONFIG.arcs.invasion.relationsBelow
      && s.stats.stability < CONFIG.arcs.invasion.stabilityBelow),
  },
];

function startHardArc(state: GameState, def: { id: string; title: string }, forced: boolean, target: string | null): ArcState {
  const arc = makeArc(state, {
    id: def.id,
    title: def.title,
    kind: 'hard',
    stage: forced ? 2 : 0,
    forceStarted: forced,
    warTarget: target,
  });
  pushChronicle(state, `⚠ Кризис: началась арка «${def.title}»`);
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
      target = n?.name ?? null;
    }
    const arc = startHardArc(state, def, forced, target);
    if (def.id === 'coup' && forced) {
      // форс-старт — мгновенный game over, права на мирный исход нет
      resolveCoup(state, arc, []);
    }
    return arc;
  }
  return null;
}

// Война по инициативе игрока — только через actionType "war" (7.7).
export function startOffensiveWar(state: GameState, targetName: string | null): ArcState | null {
  const t = CONFIG.arcs.offensiveWar;
  const q = (targetName ?? '').trim().toLowerCase();
  const target = state.neighbors.find((n) =>
    n.name.toLowerCase() === q
    || (q.length > 2 && n.name.toLowerCase().includes(q))
    || (q.length > 2 && n.name.toLowerCase().split(/\s+/).some((w) => w.length > 3 && q.includes(w))));
  if (!target) return null;

  // проверка оправдания
  const justification = state.stats.warMood
    + (100 - state.stats.education) * t.eduCoef
    + state.stats.powerConcentration * t.pcCoef;
  if (justification >= t.justificationThreshold) {
    addStatDelta(state, 'warMood', t.acceptedWarMood);
    addMoodDelta(state, 'military', t.acceptedMilitaryMood);
    pushChronicle(state, `Народ принял решение о войне с ${target.name}`);
  } else {
    addStatDelta(state, 'stability', t.rejectedStability);
    addMoodDelta(state, 'youth', t.rejectedYouthMood);
    addMoodDelta(state, 'workers', t.rejectedWorkersMood);
    addStatDelta(state, 'warMood', t.rejectedWarMood);
    pushChronicle(state, `Общество не поверило в оправдание войны с ${target.name}`);
  }
  return startHardArc(state, { id: 'offensive_war', title: `Война: ${target.name}` }, false, target.name);
}

export type ActionOutcome = { kind: 'effects'; amnestyApplied: boolean } | { kind: 'war'; arc: ArcState | null };

// Маршрутизация действия: война — в арку, остальное — эффекты (+ примирение).
export function executeAction(state: GameState, action: ParsedAction): ActionOutcome {
  if (action.actionType === 'war') {
    const arc = startOffensiveWar(state, action.warTarget);
    if (!arc) pushChronicle(state, 'Попытка объявить войну провалилась: цель не найдена.');
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
        finishArc(state, arc, 'сошло на нет');
        // новость вместо молчаливого исхода: скандал должен «выдохнуться» на глазах у игрока
        out.push({
          arcId: arc.id,
          title: arc.title,
          text: `📖 Сюжет: «${arc.title}» выдохлось — СМИ переключились на новые темы, общество постепенно забыло конфликт.`,
          kind: 'custom',
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
    pushChronicle(state, 'Генералы зачитали телеультиматум');
    out.push({ arcId: arc.id, title: arc.title, text: '⚠ Телеультиматум генералов: армия требует уступок.', kind: 'stage' });
    return;
  }
  resolveCoup(state, arc, out);
}

function resolveCoup(state: GameState, arc: ArcState, out: ArcHappening[]): void {
  const c = CONFIG.arcs.coup;
  if (arc.forceStarted) {
    setGameOver(state, 'overthrown', 'Военный переворот: армия свергла президента.');
    out.push({ arcId: arc.id, title: arc.title, text: `💥 ${state.gameOver?.reason ?? 'Переворот.'}`, kind: 'gameOver' });
    return;
  }
  if (state.mood.military * c.militaryMoodCoef + state.stats.powerConcentration * c.pcCoef > c.moodMax) {
    finishArc(state, arc, 'переворот подавлен');
    out.push({ arcId: arc.id, title: arc.title, text: '⚠ Переворот подавлен: армия осталась верна.', kind: 'endArc' });
  } else {
    setGameOver(state, 'overthrown', 'Военный переворот: армия свергла президента.');
    out.push({ arcId: arc.id, title: arc.title, text: '💥 Переворот удался. Президент свергнут.', kind: 'gameOver' });
  }
}

// protests: мирное гашение → стадия 1 столкновения → стадия 2 гражданская война.
function advanceProtests(state: GameState, arc: ArcState, out: ArcHappening[]): void {
  const p = CONFIG.arcs.protests;
  const calm = bandIndex(bandOf(state.mood.workers)) >= bandIndex('neutral')
    && bandIndex(bandOf(state.mood.youth)) >= bandIndex('neutral');
  if (!arc.forceStarted && calm) {
    finishArc(state, arc, 'мирный исход: протесты утихли');
    out.push({ arcId: arc.id, title: arc.title, text: '⚠ Протесты утихли: президент пошёл на переговоры и выполнил условия оппозиции.', kind: 'endArc' });
    return;
  }
  if (arc.stage === 0) {
    arc.stage = 1;
    addStatDelta(state, 'stability', p.stageStability);
    pushChronicle(state, 'Столкновения протестующих с полицией');
    out.push({ arcId: arc.id, title: arc.title, text: '⚠ Столкновения протестующих с полицией: стабильность падает.', kind: 'stage' });
    return;
  }
  if (arc.stage === 1) {
    addStatDelta(state, 'stability', p.stageStability);
    if (state.stats.stability < p.civilWarStabilityBelow) {
      arc.stage = 2;
      pushChronicle(state, 'Страна погрузилась в гражданскую войну');
      out.push({ arcId: arc.id, title: arc.title, text: '💥 Гражданская война началась.', kind: 'stage' });
    }
    return;
  }
  // гражданская война: каждый ход казна −10, economy −5
  addTreasury(state, -p.warTreasuryDrain);
  addStatDelta(state, 'economy', -p.warEconomyDrain);
  if (state.treasury < p.loseTreasuryBelow
    || state.mood.military * p.loseMilitaryCoef + state.treasury * p.loseTreasuryCoef < p.loseThreshold) {
    setGameOver(state, 'collapsed', 'Гражданская война поглотила страну.');
    out.push({ arcId: arc.id, title: arc.title, text: '💥 Гражданская война поглотила страну.', kind: 'gameOver' });
    return;
  }
  if (state.stats.stability > p.winStabilityAbove) {
    finishArc(state, arc, 'порядок восстановлен');
    out.push({ arcId: arc.id, title: arc.title, text: '⚠ Восстание подавлено: порядок восстановлен.', kind: 'endArc' });
  }
}

// oligarchs: взятка при высокой коррупции, оппозиция при недолюбливающих элитах.
function advanceOligarchs(state: GameState, arc: ArcState, out: ArcHappening[]): void {
  const o = CONFIG.arcs.oligarchs;
  if (state.stats.corruption > o.bribeCorruptionAbove) {
    addTreasury(state, o.bribeTreasury);
    addMoodDelta(state, 'elites', o.bribeElitesMood);
    addMoodDelta(state, 'workers', o.bribeWorkersMood);
    finishArc(state, arc, 'взятка принята');
    out.push({ arcId: arc.id, title: arc.title, text: '⚠ Олигархи предложили сделку — взятка принята. Казна потяжелела, рабочие недовольны.', kind: 'endArc' });
    return;
  }
  if (bandAtMost(state.mood.elites, 'disliking')) {
    finishArc(state, arc, 'олигархи финансируют оппозицию');
    out.push({ arcId: arc.id, title: arc.title, text: '⚠ Олигархи финансируют оппозицию.', kind: 'endArc' });
    return;
  }
  if (arc.stage === 0) {
    arc.stage = 1;
    pushChronicle(state, 'Олигархи предложили «взаимовыгодное сотрудничество»');
    out.push({ arcId: arc.id, title: arc.title, text: '⚠ Олигархи предлагают «взаимовыгодное сотрудничество».', kind: 'stage' });
  }
}

// invasion: ультиматум → развязка по обороноспособности.
function advanceInvasion(state: GameState, arc: ArcState, out: ArcHappening[]): void {
  const inv = CONFIG.arcs.invasion;
  const target = state.neighbors.find((n) => n.name === arc.warTarget) ?? state.neighbors[0];
  if (arc.stage === 0) {
    arc.stage = 1;
    pushChronicle(state, `${target.name} вручила ультиматум`);
    out.push({ arcId: arc.id, title: arc.title, text: `⚠ ${target.name} вручила ультиматум.`, kind: 'stage' });
    return;
  }
  let defense = state.mood.military + state.stats.stability
    + state.stats.warMood * inv.defenseWarMoodCoef;
  if (state.stats.warMood < inv.warMoodLowBelow) defense += inv.warMoodPenalty;
  if (defense > target.strength) {
    target.relations = clamp(target.relations + inv.winRelations, CONFIG.neighborRelationsScale.min, CONFIG.neighborRelationsScale.max);
    addStatDelta(state, 'warMood', inv.winWarMood);
    finishArc(state, arc, 'вторжение отбито');
    out.push({ arcId: arc.id, title: arc.title, text: `⚠ ${target.name} отбита! Страна празднует победу.`, kind: 'endArc' });
  } else {
    setGameOver(state, 'collapsed', `Страна капитулировала перед ${target.name}.`);
    out.push({ arcId: arc.id, title: arc.title, text: `💥 Страна капитулировала перед ${target.name}.`, kind: 'gameOver' });
  }
}

// offensive_war: еженедельные потери, развязка со 2-го хода войны.
function advanceOffensiveWar(state: GameState, arc: ArcState, out: ArcHappening[]): void {
  const w = CONFIG.arcs.offensiveWar;
  const target = state.neighbors.find((n) => n.name === arc.warTarget);
  if (!target) { // сосед исчез — закрываем арку без последствий
    finishArc(state, arc, 'цель недоступна');
    return;
  }
  addTreasury(state, -w.turnTreasuryDrain);
  addStatDelta(state, 'economy', -w.turnEconomyDrain);
  for (const n of state.neighbors) {
    if (n.name !== target.name) {
      n.relations = clamp(n.relations + w.otherNeighborsRelations, CONFIG.neighborRelationsScale.min, CONFIG.neighborRelationsScale.max);
    }
  }
  if (arc.turns < 2) {
    out.push({ arcId: arc.id, title: arc.title, text: `⚠ Война с ${target.name}: фронт держится, казна тает.`, kind: 'stage' });
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
    finishArc(state, arc, 'победа: репарации');
    out.push({ arcId: arc.id, title: arc.title, text: `⚠ Победа над ${target.name}! Репарации пополнили казну.`, kind: 'endArc' });
  } else if (state.treasury < w.loseTreasuryBelow || attack < target.strength * w.loseStrengthCoef) {
    addTreasury(state, w.loseTreasury);
    addStatDelta(state, 'warMood', -state.stats.warMood); // warMood = 0
    for (const k of MOOD_KEYS) addMoodDelta(state, k, w.loseMoodAll);
    finishArc(state, arc, 'позорный мир');
    out.push({ arcId: arc.id, title: arc.title, text: `⚠ Позорный мир с ${target.name}. Страна в трауре.`, kind: 'endArc' });
  } else {
    out.push({ arcId: arc.id, title: arc.title, text: `⚠ Война с ${target.name} продолжается: фронт замер.`, kind: 'stage' });
  }
}
