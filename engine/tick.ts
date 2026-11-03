// Тик времени (7.5): все формулы недели. Шкалы клэмпятся в 0..100.

import { CONFIG, MOOD_KEYS, clamp, type StatKey } from './config.js';
import {
  addMoodDelta, addTreasury, avgMood, bandAtMost, clampStat, growthMult, reactionAmp,
  type ArcState, type GameState,
} from './state.js';
import { pushChronicle } from './chronicle.js';
import { applyBaseEvent, eligibleEvents, type BaseEventDef } from './events.js';
import { checkArcTriggers } from './triggers.js';

export interface TickWeeksResult {
  weeksPassed: number;
  startedArc: ArcState | null; // кризис, прервавший время
  baseEvent: BaseEventDef | null;
  totalAbsStatChange: number; // сумма |Δ| по статам за тик
  calm: boolean;
}

// Тик N недель; rng внедряется для детерминированных тестов.
export function tickWeeks(
  state: GameState,
  weeks: number,
  rng: () => number = Math.random,
): TickWeeksResult {
  const before = { ...state.stats };
  let startedArc: ArcState | null = null;
  let passed = 0;

  for (let i = 0; i < weeks; i++) {
    if (state.gameOver) break;
    tickWeek(state);
    passed += 1;
    // максимум 1 новая жёсткая арка за ход — флаг newThisTurn
    const arc = checkArcTriggers(state, startedArc !== null);
    if (arc) {
      startedArc = arc;
      break; // время «прерывается» кризисом
    }
  }

  // Бросок базового ивента — раз за ход, эффекты применяет движок.
  let baseEvent: BaseEventDef | null = null;
  if (!state.gameOver && passed > 0) {
    const chance = state.arcs.length > 0
      ? CONFIG.baseEventChance.withArcs
      : CONFIG.baseEventChance.withoutArcs;
    if (rng() < chance) {
      const pool = eligibleEvents(state);
      if (pool.length > 0) {
        baseEvent = pool[Math.floor(rng() * pool.length) % pool.length];
        applyBaseEvent(state, baseEvent);
      }
    }
  }

  let totalAbs = 0;
  for (const k of Object.keys(before) as StatKey[]) {
    totalAbs += Math.abs(state.stats[k] - before[k]);
  }
  const calm = passed > 0 && !startedArc && !baseEvent && totalAbs < 3;
  return { weeksPassed: passed, startedArc, baseEvent, totalAbsStatChange: totalAbs, calm };
}

// Одна неделя по формулам 7.5.
export function tickWeek(state: GameState): void {
  const t = CONFIG.tick;
  const s = state.stats;

  state.prevHomelessness = state.homelessness;
  state.prevPopulation = state.population;

  const g = growthMult(state); // множитель роста по поясам групп
  const emigrantGroups = MOOD_KEYS.filter((k) => bandAtMost(state.mood[k], 'disliking')).length;

  // economy: [ (stability−50)*0.02 − corruption*0.005 + (technology−45)*0.01
  //            + (education−45)*0.01 ] * growthMult * 0.25
  s.economy = clampStat(s.economy + (
    (s.stability - t.economy.stabBase) * t.economy.stabCoef
    - s.corruption * t.economy.corruptionCoef
    + (s.technology - t.economy.techBase) * t.economy.techCoef
    + (s.education - t.economy.eduBase) * t.economy.eduCoef
  ) * g * t.economy.weekMult);

  // technology: [ (education−45)*0.03 + (economy−50)*0.02 ] * 0.25;
  // freedom < 30 — душит науку; technology > 75 — цена прогресса.
  let techDelta = (
    (s.education - t.technology.eduBase) * t.technology.eduCoef
    + (s.economy - t.technology.econBase) * t.technology.econCoef
  ) * t.technology.weekMult;
  if (s.freedom < t.technology.freedomSuppressBelow) techDelta /= t.technology.suppressDiv;
  s.technology = clampStat(s.technology + techDelta);
  if (s.technology > t.technology.priceThreshold) {
    s.freedom = clampStat(s.freedom - t.technology.freedomCost);
    addMoodDelta(state, 'youth', -t.technology.youthMoodCost);
  }

  // education: [ (economy−45)*0.01 + (50−poverty)*0.01 ] * 0.25; казна < 0 — минус.
  let eduDelta = (
    (s.economy - t.education.econBase) * t.education.econCoef
    + (t.education.povertyBase - s.poverty) * t.education.povertyCoef
  ) * t.education.weekMult;
  if (state.treasury < 0) eduDelta -= t.education.brokeTreasuryDrain;
  s.education = clampStat(s.education + eduDelta);

  // warMood: тяготение к 10; военные арки; нервные соседи; бонус силовикам.
  s.warMood = clampStat(s.warMood + (t.warMood.base - s.warMood) * t.warMood.pullCoef);
  if (state.arcs.some((a) => a.id === 'offensive_war' || a.id === 'invasion')) {
    s.warMood = clampStat(s.warMood + t.warMood.activeWarArcDelta);
  }
  if (state.neighbors.some((n) => n.relations < t.warMood.hostileRelationsBelow)) {
    s.warMood = clampStat(s.warMood + t.warMood.hostileDelta);
  }
  if (s.warMood > t.warMood.jitterAbove) {
    for (const n of state.neighbors) {
      n.relations = clamp(n.relations + t.warMood.jitterDelta, CONFIG.neighborRelationsScale.min, CONFIG.neighborRelationsScale.max);
    }
  }
  if (s.warMood > t.warMood.militaryBoostAbove) {
    addMoodDelta(state, 'military', t.warMood.militaryBoostDelta);
  }

  // unemployment / inflation / poverty / stability / corruption
  s.unemployment = clampStat(s.unemployment
    + (t.unemployment.econBase - s.economy) * t.unemployment.econCoef * t.unemployment.weekMult);
  s.inflation = clampStat(s.inflation
    + (state.treasury < t.inflation.brokenTreasuryBelow ? t.inflation.brokenDelta : t.inflation.normalDelta));
  s.poverty = clampStat(s.poverty
    + ((s.unemployment - t.poverty.unempBase) * t.poverty.unempCoef + s.inflation * t.poverty.inflationCoef)
    * t.poverty.weekMult);
  s.stability = clampStat(s.stability
    + (avgMood(state) - t.stability.avgMoodBase) * t.stability.avgMoodCoef * t.stability.weekMult);
  s.corruption = clampStat(s.corruption
    + (s.powerConcentration > t.corruption.concentrationAbove ? t.corruption.growDelta : t.corruption.fallDelta));

  // казна: [ economy/100*4 − poverty/100*3 − 1 ] * growthMult * 0.25 * (population/10)
  state.treasury += (
    s.economy / 100 * t.treasury.econCoef
    - s.poverty / 100 * t.treasury.povertyCoef
    - t.treasury.baseCost
  ) * g * t.treasury.weekMult * (state.population / t.treasury.populationDiv);
  if (!Number.isFinite(state.treasury)) state.treasury = 0; // страховка от NaN

  // соседи: дрейф relations к нулю
  for (const n of state.neighbors) {
    n.relations = clamp(n.relations * t.neighborDrift, CONFIG.neighborRelationsScale.min, CONFIG.neighborRelationsScale.max);
  }

  // housingBubble (0..30): рост при economy > 70, иначе спад; лопается.
  const hb = t.housingBubble;
  state.housingBubble = clamp(
    state.housingBubble + (s.economy > hb.growAbove ? hb.growDelta : -hb.decayDelta),
    0, hb.max,
  );
  if (s.economy < hb.burstEconBelow && state.housingBubble > hb.burstBubbleAbove) {
    state.housingBubble = 0;
    s.economy = clampStat(s.economy + hb.burstEconomy);
    addMoodDelta(state, 'elites', hb.burstElitesMood);
    addTreasury(state, hb.burstTreasury);
    pushChronicle(state, { k: 'housingBubbleBurst' });
  }

  // homelessness: пересчёт каждую неделю, не накапливается.
  const h = t.homelessness;
  state.homelessness = clamp(
    (s.poverty - h.povertyBase) * h.povertyCoef + state.housingBubble * h.bubbleCoef,
    0, h.max,
  );
  if (state.homelessness > h.drainThreshold) {
    addMoodDelta(state, 'workers', -h.workersDrain);
    addMoodDelta(state, 'youth', -h.youthDrain);
  }

  // population: базовый рост; минус за бедность и эмиграцию из недолюбливающих групп.
  const p = t.population;
  let growthRate = p.baseGrowth;
  if (s.poverty > p.povertyAbove) growthRate += p.povertyPenalty;
  growthRate += emigrantGroups * p.emigrantPenalty;
  state.population = Math.max(0, state.population * (1 + growthRate));

  // эмиграция: за КАЖДУЮ группу в поясе disliking или ниже — economy −0.1, education −0.05
  const em = t.emigration;
  for (let i = 0; i < emigrantGroups; i++) {
    s.economy = clampStat(s.economy - em.economyDrain);
    s.education = clampStat(s.education - em.educationDrain);
  }

  // Настроения слоёв (все дельты — через addMoodDelta: amp + смягчение + заморозка).
  const m = t.mood;
  addMoodDelta(state, 'workers', (
    (m.workers.unempBase - s.unemployment * m.workers.unempMult) * m.workers.unempCoef
    + (m.workers.povertyBase - s.poverty) * m.workers.povertyCoef
  ) * m.workers.weekMult);
  addMoodDelta(state, 'youth', (
    (s.freedom - m.youth.freedomBase) * m.youth.freedomCoef
    + (m.youth.povertyBase - s.poverty) * m.youth.povertyCoef
    + (s.economy - m.youth.economyBase) * m.youth.economyCoef
  ) * m.youth.weekMult);
  addMoodDelta(state, 'elites', (
    (s.economy - m.elites.economyBase) * m.elites.economyCoef
    + (s.corruption - m.elites.corruptionBase) * m.elites.corruptionCoef
  ) * m.elites.weekMult);
  addMoodDelta(state, 'military', (
    (s.stability - m.military.stabilityBase) * m.military.stabilityCoef
    + (s.warMood - m.military.warMoodBase) * m.military.warMoodCoef
  ) * m.military.weekMult);

  state.week += 1;
}
