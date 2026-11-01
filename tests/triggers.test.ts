// Тесты 3, 4, 11: триггеры арок, развязки, война по инициативе игрока.

import { describe, expect, test } from 'vitest';
import { makeState } from './helpers.js';
import {
  advanceArcs, checkArcTriggers, executeAction, HARD_TRIGGERS,
} from '../engine/triggers.js';
import { validateAction } from '../engine/validator.js';
import { createInitialState } from '../engine/state.js';

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
    expect(invasion?.warTarget).toBe('Северная Империя');

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
      { summary: 'война', actionType: 'war', warTarget: 'Республика Країн' },
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
      { summary: 'война', actionType: 'war', warTarget: 'Республика Країн', effects: { economy: 50 }, treasuryDelta: 100, absurdity: 10 },
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
});
