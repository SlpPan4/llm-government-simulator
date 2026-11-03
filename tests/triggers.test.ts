// Тесты 3, 4, 11: триггеры арок, развязки, война по инициативе игрока.

import { describe, expect, test } from 'vitest';
import { makeState } from './helpers.js';
import { renderHappening } from '../i18n.js';
import {
  advanceArcs, checkArcTriggers, executeAction, HARD_TRIGGERS,
} from '../engine/triggers.js';
import { validateAction } from '../engine/validator.js';
import { createInitialState, makeArc, type GameState } from '../engine/state.js';
import { CONFIG } from '../engine/config.js';

describe('триггеры арок', () => {
  test('3. каждый триггер из конфига: условие выполнено → арка стартовала', () => {
    // coup: band(military) <= disliking И avgMood <= 40
    let s = makeState('realism', (x) => {
      x.mood.military = 30; x.mood.elites = 30; x.mood.workers = 30; x.mood.youth = 30;
    });
    expect(checkArcTriggers(s, false)?.id).toBe('coup');

    // protests: workers в disliking И freedom < 50
    s = makeState('realism', (x) => { x.mood.workers = 30; x.stats.freedom = 40; });
    expect(checkArcTriggers(s, false)?.id).toBe('protests');

    // oligarchs: corruption > 55 И economy > 40
    s = makeState('realism', (x) => { x.stats.corruption = 60; x.stats.economy = 50; });
    expect(checkArcTriggers(s, false)?.id).toBe('oligarchs');

    // invasion: strength 80 > 1.5*(50+pc/2), relations < −40, stability < 45
    s = makeState('realism', (x) => {
      x.neighbors[0].relations = -50; x.stats.stability = 40; x.stats.powerConcentration = 0;
    });
    const invasion = checkArcTriggers(s, false);
    expect(invasion?.id).toBe('invasion');
    expect(invasion?.warTarget).toBe('north_empire');

    // все 4 жёстких триггера присутствуют в конфиге
    expect(HARD_TRIGGERS.map((t) => t.id)).toEqual(['coup', 'protests', 'oligarchs', 'invasion']);

    // лимит: новая жёсткая арка не стартует, если уже была за ход
    s = makeState('realism', (x) => {
      x.mood.military = 30; x.mood.elites = 30; x.mood.workers = 30; x.mood.youth = 30;
    });
    expect(checkArcTriggers(s, true)).toBeNull();

    // лимит активных арок
    s = makeState('realism', (x) => {
      x.mood.military = 30; x.mood.elites = 30; x.mood.workers = 30; x.mood.youth = 30;
      x.arcs = [
        { id: 'a1', title: 'a1', kind: 'custom', stage: 0, turns: 0, startedWeek: 1, lastUpdateWeek: 1, forceStarted: false, warTarget: null, description: '' },
        { id: 'a2', title: 'a2', kind: 'custom', stage: 0, turns: 0, startedWeek: 1, lastUpdateWeek: 1, forceStarted: false, warTarget: null, description: '' },
        { id: 'a3', title: 'a3', kind: 'custom', stage: 0, turns: 0, startedWeek: 1, lastUpdateWeek: 1, forceStarted: false, warTarget: null, description: '' },
      ];
    });
    expect(checkArcTriggers(s, false)).toBeNull();
  });

  test('4. каждая арка доводится хотя бы до одной развязки', () => {
    // coup → подавление (endArc)
    let s = makeState('realism', (x) => {
      x.mood.military = 30; x.mood.elites = 30; x.mood.workers = 30; x.mood.youth = 30;
    });
    checkArcTriggers(s, false);
    s.mood.military = 80; s.stats.powerConcentration = 50; // 80*1 + 50*0.5 > 70
    advanceArcs(s); // стадия 0 → 1
    expect(s.arcs.some((a) => a.id === 'coup')).toBe(true);
    advanceArcs(s); // развязка
    expect(s.finishedArcs.some((a) => a.id === 'coup')).toBe(true);
    expect(s.gameOver).toBeNull();

    // protests → мирное гашение (endArc)
    s = makeState('realism', (x) => { x.mood.workers = 30; x.stats.freedom = 40; });
    checkArcTriggers(s, false);
    s.mood.workers = 60; s.mood.youth = 60;
    advanceArcs(s);
    expect(s.finishedArcs.some((a) => a.id === 'protests')).toBe(true);

    // protests (форс-старт) → гражданская война → крах (game over)
    s = makeState('realism', (x) => { x.mood.workers = 3; x.stats.freedom = 40; x.treasury = -60; });
    const protests = checkArcTriggers(s, false);
    expect(protests?.id).toBe('protests');
    expect(protests?.stage).toBe(2);
    advanceArcs(s); // казна < −50 → крах
    expect(s.gameOver?.ending).toBe('collapsed');

    // oligarchs → взятка принята (endArc)
    s = makeState('realism', (x) => { x.stats.corruption = 70; x.stats.economy = 50; });
    checkArcTriggers(s, false);
    advanceArcs(s);
    expect(s.finishedArcs.some((a) => a.id === 'oligarchs')).toBe(true);

    // invasion → вторжение отбито (endArc)
    s = makeState('realism', (x) => {
      x.neighbors[0].relations = -50; x.stats.stability = 40; x.stats.powerConcentration = 0;
      x.mood.military = 60; x.stats.warMood = 30;
    });
    checkArcTriggers(s, false);
    advanceArcs(s); // ультиматум
    advanceArcs(s); // развязка: 60 + 40 + 15 = 115 > 80
    expect(s.finishedArcs.some((a) => a.id === 'invasion')).toBe(true);
    expect(s.gameOver).toBeNull();

    // offensive_war → победа (endArc)
    s = createInitialState('realism', 'Тестландия');
    s.mood.military = 70; s.stats.warMood = 40; s.stats.technology = 60; s.treasury = 100;
    executeAction(s, validateAction(
      { summary: 'война', actionType: 'war', warTarget: 'kraina' },
      'realism',
    ));
    advanceArcs(s); // ход 1 войны
    advanceArcs(s); // ход 2: 35+20+18+10=83 > 45 → победа
    expect(s.finishedArcs.some((a) => a.id === 'offensive_war')).toBe(true);
    expect(s.gameOver).toBeNull();
  });

  test('11. actionType "war" стартует арку offensive_war вместо applyEffects', () => {
    const s = makeState();
    const p = validateAction(
      { summary: 'война', actionType: 'war', warTarget: 'kraina', effects: { economy: 50 }, treasuryDelta: 100, absurdity: 10 },
      'realism',
    );
    const outcome = executeAction(s, p);
    expect(outcome.kind).toBe('war');
    expect(s.arcs.some((a) => a.id === 'offensive_war')).toBe(true);
    // эффекты действия НЕ применились
    expect(s.stats.economy).toBe(50);
    expect(s.treasury).toBe(100);
    // но действие засчитано
    expect(s.actionsCount).toBe(1);
    expect(s.absurdityTotal).toBe(10);
  });

  test('проблема 2: таймаут кастомной арки — с новостью, а не молча', () => {
    const s = makeState();
    const arc = makeArc(s, { id: 'старое_дело', title: 'Дело о пропавших креслах', kind: 'custom' });
    arc.lastUpdateWeek = 10;
    s.week = 10 + CONFIG.run.customArcTimeoutWeeks + 1;
    const happenings = advanceArcs(s);
    expect(happenings).toHaveLength(1);
    expect(happenings[0].msg).toEqual({ k: 'arcFizzled', title: 'Дело о пропавших креслах' });
    expect(renderHappening('ru', happenings[0].msg)).toContain('СМИ');
    expect(s.arcs).toHaveLength(0);
    expect(s.finishedArcs.some((a) => a.id === 'старое_дело' && a.outcome === 'fizzled')).toBe(true);
    expect(s.chronicle.some((c) => typeof c !== 'string' && c.k === 'arcFinished' && c.outcome === 'fizzled'))
      .toBe(true);
  });

  test('проблема 2: свежая кастомная арка на таймаут не проверяется', () => {
    const s = makeState();
    makeArc(s, { id: 'свежак', title: 'Свежий скандал', kind: 'custom' });
    s.week = CONFIG.run.customArcTimeoutWeeks; // прошло ровно столько, сколько лимит
    expect(advanceArcs(s)).toHaveLength(0);
    expect(s.arcs).toHaveLength(1);
  });

  test('проблема 3: флаг примирения размораживает слои по цене из конфига', () => {
    const s = makeState('realism', (x) => {
      x.mood.elites = 0; x.impeachmentFrozen.elites = true;
      x.mood.workers = 3; x.impeachmentFrozen.workers = true;
    });
    const before = s.treasury;
    const outcome = executeAction(s, validateAction(
      { summary: 'амнистия', effects: {}, mood: {}, treasuryDelta: 0, absurdity: 5, impeachmentAmnesty: true },
      'realism',
    ));
    expect(outcome.kind).toBe('effects');
    if (outcome.kind !== 'effects') return;
    expect(outcome.amnestyApplied).toBe(true);
    expect(s.impeachmentFrozen.elites).toBe(false);
    expect(s.impeachmentFrozen.workers).toBe(false);
    expect(s.mood.elites).toBe(CONFIG.impeachmentAmnesty.floor);
    expect(s.mood.workers).toBe(CONFIG.impeachmentAmnesty.floor);
    expect(s.treasury).toBeCloseTo(before - CONFIG.impeachmentAmnesty.treasuryCost);
    expect(s.stats.stability).toBe(65 - CONFIG.impeachmentAmnesty.stabilityCost);
    expect(s.amnestyCount).toBe(1);
  });

  test('проблема 3: без заморозки, по кулдауну и сверх лимита — примирение не срабатывает', () => {
    const amnestyOn = (s: GameState): boolean => {
      const outcome = executeAction(s, validateAction(
        { summary: 'x', impeachmentAmnesty: true }, 'realism',
      ));
      return outcome.kind === 'effects' && outcome.amnestyApplied;
    };
    // нет замороженных слоёв
    expect(amnestyOn(makeState())).toBe(false);

    // кулдаун: повторно на той же неделе — отказ
    const s2 = makeState('realism', (x) => { x.mood.elites = 0; x.impeachmentFrozen.elites = true; });
    expect(amnestyOn(s2)).toBe(true);
    s2.mood.elites = 0; s2.impeachmentFrozen.elites = true;
    expect(amnestyOn(s2)).toBe(false);

    // лимит за ран
    const s3 = makeState('realism', (x) => {
      x.mood.elites = 0; x.impeachmentFrozen.elites = true;
      x.amnestyCount = CONFIG.impeachmentAmnesty.maxPerRun;
      x.week = 200; // кулдаун уже не спасает
    });
    expect(amnestyOn(s3)).toBe(false);
    expect(s3.impeachmentFrozen.elites).toBe(true);
  });
});
