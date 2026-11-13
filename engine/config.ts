// ═══ КОНФИГ ИГРЫ ═══
// Весь баланс — только здесь (спецификация 7.1–7.9).
// Числа из конфига запрещено хардкодить в логике — только импорт отсюда.

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

// 7.1. Характеристики государства (шкала 0..100)
export const STAT_KEYS = [
  'economy', 'poverty', 'unemployment', 'inflation', 'freedom', 'corruption',
  'stability', 'powerConcentration', 'education', 'technology', 'warMood',
] as const;
export type StatKey = (typeof STAT_KEYS)[number];

// 7.2. Слои населения (0..100, выше = лояльнее)
export const MOOD_KEYS = ['elites', 'military', 'workers', 'youth'] as const;
export type MoodKey = (typeof MOOD_KEYS)[number];

export type MoodBand =
  | 'impeachment' | 'hatred' | 'disliking' | 'unrest'
  | 'neutral' | 'positive' | 'love';

// 7.3. Словарь идеологических тегов
export const IDEOLOGY_TAGS = [
  'militarism', 'pacifism', 'welfare', 'austerity', 'authoritarianism',
  'liberalism', 'technocracy', 'traditionalism', 'nationalism',
  'globalism', 'ecology', 'populism',
] as const;
export type IdeologyTag = (typeof IDEOLOGY_TAGS)[number];

export const ACTION_TYPES = ['law', 'decree', 'statement', 'war', 'other'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export type GameMode = 'realism' | 'creative';

// 7.7. Идентификаторы жёстких арок: названия для игрока живут в i18n.ts
// (движок языка не знает — закон 2), здесь — только ключи.
export const HARD_ARC_IDS = ['coup', 'protests', 'oligarchs', 'invasion', 'offensive_war'] as const;
export type HardArcId = (typeof HARD_ARC_IDS)[number];

export const CONFIG = {
  // 7.1 (подписи для игрока — в i18n.ts)
  stats: {
    economy: { start: 50 },
    poverty: { start: 40 },
    unemployment: { start: 15 },
    inflation: { start: 10 },
    freedom: { start: 60 },
    corruption: { start: 35 },
    stability: { start: 65 },
    powerConcentration: { start: 20 },
    education: { start: 45 },
    technology: { start: 45 },
    warMood: { start: 10 },
  },

  // 7.2. Слои и пояса настроений (применяются к каждой группе отдельно)
  moods: {
    elites: { start: 55 },
    military: { start: 60 },
    workers: { start: 50 },
    youth: { start: 55 },
  },
  moodBands: [
    { band: 'impeachment', min: 0, max: 4, growthMult: 0.0 },
    { band: 'hatred', min: 5, max: 19, growthMult: 0.5 },
    { band: 'disliking', min: 20, max: 39, growthMult: 0.8 },
    { band: 'unrest', min: 40, max: 54, growthMult: 0.9 },
    { band: 'neutral', min: 55, max: 65, growthMult: 1.0 },
    { band: 'positive', min: 66, max: 85, growthMult: 1.3 },
    { band: 'love', min: 86, max: 100, growthMult: 1.6 },
  ],

  // 7.3. Общие параметры рана
  run: {
    termWeeks: 192, // 48 месяцев
    startTreasury: 100, // млрд, может уходить в минус
    skipMinWeeks: 2,
    skipMaxWeeks: 13,
    weeksAfterAction: 12,
    maxActiveArcs: 3,
    maxNewHardArcsPerTurn: 1,
    dynamicEventCooldownWeeks: 4,
    chronicleLimit: 15,
    customArcTimeoutWeeks: 24,
    maxArcStage: 5, // 7.8.1: потолок стадии арки при продолжениях
  },
  statScale: { min: 0, max: 100 },
  neighborRelationsScale: { min: -100, max: 100 },

  // 7.3.1 + 7.4. Потолки валидатора (действия)
  caps: {
    realism: { stat: 20, mood: 15, treasury: 50 },
    creative: { stat: 30, mood: 20, treasury: 75, negativeMoodMult: 0.7 },
  },

  // 7.4.1. Потолки валидатора для динамических событий (оба режима)
  dynamicEventCaps: { stat: 10, mood: 10, treasury: 20 },

  absurdity: { min: 0, max: 100, printThreshold: 50 },

  // «Великое примирение»: дорогой жест примирения снимает заморозку импичмента.
  // Срабатывает, когда парсер LLM вернул impeachmentAmnesty: true (см. llm/prompts.ts).
  impeachmentAmnesty: {
    floor: 12, // настроение размороженного слоя после жеста
    treasuryCost: 30, // млрд
    stabilityCost: 10,
    cooldownWeeks: 36, // между применениями
    maxPerRun: 2,
  },

  // 7.6. Соседи: стабильные id; отображаемые имена — в i18n.ts (NEIGHBOR_NAMES)
  neighbors: [
    { id: 'north_empire', strength: 80, relations: 0 },
    { id: 'kraina', strength: 45, relations: 20 },
  ],

  // 7.8. Шанс базового ивента за ход
  baseEventChance: { withoutArcs: 0.25, withArcs: 0.1 },

  // 7.5. Формулы тика (коэффициенты; сами формулы — в engine/tick.ts)
  tick: {
    loveFallMult: 0.3, // смягчение падения в поясе love
    positiveFallMult: 0.7, // смягчение падения в поясе positive
    reactionBase: 0.5, // reactionAmp = 0.5 + education/100
    reactionEduDiv: 100,
    emigration: { economyDrain: 0.1, educationDrain: 0.05 }, // за группу в поясе disliking или ниже
    economy: {
      stabBase: 50, stabCoef: 0.02,
      corruptionCoef: 0.005,
      techBase: 45, techCoef: 0.01,
      eduBase: 45, eduCoef: 0.01,
      weekMult: 0.25,
    },
    technology: {
      eduBase: 45, eduCoef: 0.03,
      econBase: 50, econCoef: 0.02,
      weekMult: 0.25,
      freedomSuppressBelow: 30, suppressDiv: 2,
      priceThreshold: 75, freedomCost: 0.05, youthMoodCost: 0.1,
    },
    education: {
      econBase: 45, econCoef: 0.01,
      povertyBase: 50, povertyCoef: 0.01,
      weekMult: 0.25,
      brokeTreasuryDrain: 0.05, // если казна < 0
    },
    warMood: {
      base: 10, pullCoef: 0.01,
      activeWarArcDelta: 1,
      hostileRelationsBelow: -50, hostileDelta: 0.2,
      jitterAbove: 70, jitterDelta: -0.1,
      militaryBoostAbove: 60, militaryBoostDelta: 0.1,
    },
    unemployment: { econBase: 50, econCoef: 0.01, weekMult: 0.25 },
    inflation: { brokenTreasuryBelow: -20, brokenDelta: 0.125, normalDelta: -0.025 },
    poverty: { unempBase: 15, unempCoef: 0.02, inflationCoef: 0.03, weekMult: 0.25 },
    stability: { avgMoodBase: 50, avgMoodCoef: 0.03, weekMult: 0.25 },
    corruption: { concentrationAbove: 60, growDelta: 0.04, fallDelta: 0.0125 },
    treasury: {
      econCoef: 4, povertyCoef: 3, baseCost: 1,
      weekMult: 0.25, populationDiv: 10,
    },
    neighborDrift: 0.9975,
    housingBubble: {
      max: 30, start: 0,
      growAbove: 70, growDelta: 0.05, decayDelta: 0.1,
      burstEconBelow: 55, burstBubbleAbove: 15,
      burstEconomy: -10, burstElitesMood: -10, burstTreasury: -15,
    },
    homelessness: {
      start: 4, povertyBase: 20, povertyCoef: 0.2, bubbleCoef: 0.5,
      max: 40, drainThreshold: 15, workersDrain: 0.1, youthDrain: 0.1,
    },
    population: {
      start: 10,
      baseGrowth: 0.00001,
      povertyAbove: 50, povertyPenalty: -0.00002,
      emigrantPenalty: -0.00002, // за каждую группу в поясе disliking или ниже
    },
    mood: {
      workers: {
        unempBase: 50, unempMult: 2, unempCoef: 0.03,
        povertyBase: 50, povertyCoef: 0.02, weekMult: 0.25,
      },
      youth: {
        freedomBase: 50, freedomCoef: 0.04,
        povertyBase: 50, povertyCoef: 0.01,
        economyBase: 50, economyCoef: 0.02, weekMult: 0.25,
      },
      elites: {
        economyBase: 50, economyCoef: 0.03,
        corruptionBase: 30, corruptionCoef: 0.02, weekMult: 0.25,
      },
      military: {
        stabilityBase: 50, stabilityCoef: 0.02,
        warMoodBase: 10, warMoodCoef: 0.01, weekMult: 0.25,
      },
    },
  },

  // 7.7. Жёсткие арки: пороги и эффекты стадий
  arcs: {
    coup: {
      avgMoodMax: 40,
      moodMax: 70, militaryMoodCoef: 1, pcCoef: 0.5, // развязка: military + pc*0.5 > 70
    },
    protests: {
      freedomBelow: 50, homelessnessAbove: 25,
      stageStability: -10,
      civilWarStabilityBelow: 20,
      warTreasuryDrain: 10, warEconomyDrain: 5,
      loseTreasuryBelow: -50,
      loseMilitaryCoef: 0.6, loseTreasuryCoef: 0.2, loseThreshold: 30,
      winStabilityAbove: 60,
    },
    oligarchs: {
      corruptionAbove: 55, economyAbove: 40,
      bribeCorruptionAbove: 65,
      bribeTreasury: 30, bribeElitesMood: 15, bribeWorkersMood: -10,
    },
    invasion: {
      strengthCoef: 1.5, baseDefense: 50, pcCoef: 0.5,
      relationsBelow: -40, stabilityBelow: 45,
      defenseWarMoodCoef: 0.5,
      warMoodLowBelow: 20, warMoodPenalty: -15,
      winRelations: 30, winWarMood: 20,
    },
    offensiveWar: {
      justificationThreshold: 60, eduCoef: 0.5, pcCoef: 0.3,
      acceptedWarMood: 20, acceptedMilitaryMood: 10,
      rejectedStability: -15, rejectedYouthMood: -20,
      rejectedWorkersMood: -10, rejectedWarMood: -10,
      turnTreasuryDrain: 12, turnEconomyDrain: 4, otherNeighborsRelations: -5,
      attackMilitaryCoef: 0.5, attackWarMoodCoef: 0.5,
      attackTechCoef: 0.3, attackTreasuryCoef: 0.1,
      winTreasury: 40, winWarMood: 15, winPc: 10, winRelations: -30,
      loseTreasuryBelow: -60, loseStrengthCoef: 0.5,
      loseTreasury: -40, loseMoodAll: -15,
    },
  },

  // 7.8. Базовые ивенты (скелеты: id + условия + эффекты; эффекты фиксированы
  // и применяет движок). Отображаемые названия — в i18n.ts (BASE_EVENT_TITLES).
  baseEvents: [
    {
      id: 'earthquake',
      effects: { treasury: -15, ifTreasuryNegativeMoodAll: -10 },
    },
    {
      id: 'oil_boom',
      effects: { stats: { corruption: 5 }, treasury: 25 },
    },
    {
      id: 'athlete_win',
      effects: { moodAll: 5 },
    },
    {
      id: 'brain_drain',
      when: { any: [{ stat: 'freedom', below: 40 }, { moodBandAtMost: { key: 'youth', band: 'hatred' } }] },
      effects: { stats: { economy: -5, technology: -3 }, mood: { youth: -5 } },
    },
    {
      id: 'scandal',
      effects: { stats: { corruption: 5, stability: -5 } },
    },
    {
      id: 'tech_breakthrough',
      when: { any: [{ stat: 'technology', above: 60 }] },
      effects: { stats: { technology: 5, economy: 5, freedom: -3 } },
    },
    {
      id: 'student_unrest',
      when: { all: [{ stat: 'education', above: 60 }, { stat: 'freedom', below: 40 }] },
      effects: { mood: { youth: -8 }, stats: { stability: -5 } },
    },
    {
      id: 'military_parade',
      effects: { stats: { warMood: 5 }, mood: { military: 5 }, treasury: -5 },
    },
    {
      id: 'draft_fail',
      when: { any: [{ stat: 'warMood', below: 20 }] },
      effects: { mood: { youth: -5 }, stats: { stability: -3 } },
    },
    {
      id: 'science_grant',
      effects: { stats: { education: 3 }, treasury: -5 },
    },
    {
      id: 'folk_unity',
      when: { anyBandAtLeast: 'love' },
      effects: { moodAll: 3, stats: { stability: 3 } },
    },
    {
      id: 'tent_city',
      when: { any: [{ derived: 'homelessness', above: 15 }] },
      effects: { mood: { youth: -5 }, stats: { stability: -3 } },
    },
    {
      id: 'harvest_failure',
      when: { all: [{ stat: 'inflation', above: 15 }, { stat: 'economy', below: 50 }] },
      effects: { stats: { poverty: 5, economy: -3 }, mood: { workers: -5 } },
    },
    {
      id: 'foreign_investment',
      when: { any: [{ stat: 'economy', above: 55 }] },
      effects: { stats: { economy: 5, technology: 3 }, treasury: 10 },
    },
    {
      id: 'currency_crisis',
      when: { any: [{ stat: 'inflation', above: 30 }] },
      effects: { stats: { economy: -5, inflation: 5, stability: -3 }, treasury: -10 },
    },
    {
      id: 'viral_meme',
      effects: { mood: { youth: 6 }, moodAll: 3 },
    },
    {
      id: 'epidemic',
      when: { any: [{ stat: 'poverty', above: 50 }] },
      effects: { stats: { economy: -4, poverty: 3 }, moodAll: -4, treasury: -15 },
    },
    {
      id: 'factory_closure',
      when: { all: [{ stat: 'economy', below: 45 }, { stat: 'unemployment', above: 15 }] },
      effects: { mood: { workers: -8 }, stats: { unemployment: 5, stability: -3 } },
    },
    {
      id: 'railway_accident',
      effects: { treasury: -15, stats: { stability: -4 }, moodAll: -3 },
    },
    {
      id: 'startup_boom',
      when: { all: [{ stat: 'technology', above: 55 }, { stat: 'freedom', above: 50 }] },
      effects: { stats: { technology: 4, economy: 4 }, mood: { youth: 5 } },
    },
    {
      id: 'spy_scandal',
      effects: { stats: { stability: -5, corruption: 4 }, mood: { military: 3 } },
    },
    {
      id: 'pensioner_march',
      when: { any: [{ moodBandAtMost: { key: 'workers', band: 'disliking' } }] },
      effects: { mood: { workers: -5 }, stats: { stability: -4 } },
    },
    {
      id: 'expo_forum',
      when: { any: [{ stat: 'stability', above: 55 }] },
      effects: { stats: { economy: 4, freedom: 3 }, treasury: -10, moodAll: 4 },
    },
    {
      id: 'oligarch_lobby',
      when: { any: [{ stat: 'corruption', above: 40 }] },
      effects: { stats: { corruption: 5 }, treasury: 10, mood: { workers: -5 } },
    },
  ],

  // 7.9. Концовки и счёт
  endings: {
    stayPowerThreshold: 50,
    stayFormulaThreshold: 90, // pc + military*0.5 − (100−stability)*0.5 > 90
    militaryHalfCoef: 0.5, stabilityHalfCoef: 0.5,
    reelectAvgMood: 66, willfulAvgMood: 25, willfulStability: 70,
    multipliers: {
      peaceful_handover: 1.0,
      reelected: 1.2,
      reelected_willful: 1.1,
      for_life: 1.5,
      overthrown: 0.4,
      collapsed: 0.2,
    },
  },
  score: {
    baseDiv: 6.75,
    economyCoef: 1, povertyCoef: 1, unemploymentCoef: 2, freedomCoef: 1,
    stabilityCoef: 1, corruptionCoef: 0.5, educationCoef: 0.5,
    technologyCoef: 0.5, warMoodCoef: 0.25, treasuryCoef: 0.5,
    clampTreasuryMax: 100,
    creativeAbsurdCoef: 0.3,
    realismAbsurdFree: 35, realismAbsurdPenalty: 0.15, realismAbsurdRange: 65,
  },
} as const;
