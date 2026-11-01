// Тесты 5 и 10: концовки, счёт, модификатор абсурда.

import { describe, expect, test } from 'vitest';
import { makeState } from './helpers.js';
import {
  absurdityMod, computeScore, makeEnding, resolveTermEnding, type EndingResult,
} from '../engine/score.js';

describe('счёт и концовки', () => {
  test('5. плохая страна + диктатура < хорошая страна + мирный уход', () => {
    // Плохая страна, удержавшая власть (for_life ×1.5)
    const bad = makeState('realism', (s) => {
      s.stats.economy = 20; s.stats.poverty = 80; s.stats.unemployment = 30;
      s.stats.freedom = 30; s.stats.stability = 30; s.stats.corruption = 80;
      s.stats.education = 20; s.stats.technology = 20; s.stats.warMood = 10;
      s.stats.powerConcentration = 90; s.treasury = 0; s.absurdityTotal = 0; s.actionsCount = 0;
    });
    const badEnding: EndingResult = makeEnding('for_life', 'удержал власть');
    const badScore = computeScore(bad, badEnding).total;

    // Хорошая страна, мирная передача (peaceful_handover ×1.0)
    const good = makeState('realism', (s) => {
      s.stats.economy = 80; s.stats.poverty = 10; s.stats.unemployment = 5;
      s.stats.freedom = 80; s.stats.stability = 80; s.stats.corruption = 10;
      s.stats.education = 80; s.stats.technology = 80; s.stats.warMood = 20;
      s.treasury = 100; s.absurdityTotal = 0; s.actionsCount = 0;
    });
    const goodScore = computeScore(good, makeEnding('peaceful_handover', 'мирный уход')).total;

    expect(badScore).toBeLessThan(goodScore);
    expect(badEnding.multiplier).toBe(1.5); // диктатура ×1.5 и всё равно меньше
  });

  test('10. модификатор абсурда: creative — бонус, realism — свобода до 35, штраф выше', () => {
    // creative: высокий абсурд повышает итог
    expect(absurdityMod('creative', 0)).toBeCloseTo(1);
    expect(absurdityMod('creative', 80)).toBeGreaterThan(1);
    expect(absurdityMod('creative', 100)).toBeCloseTo(1.3);

    // realism: до 35 включительно не влияет вообще
    expect(absurdityMod('realism', 0)).toBe(1);
    expect(absurdityMod('realism', 35)).toBe(1);
    // выше 35 — небольшой штраф
    expect(absurdityMod('realism', 36)).toBeLessThan(1);
    expect(absurdityMod('realism', 100)).toBeCloseTo(0.85);
    expect(absurdityMod('realism', 100)).toBeGreaterThan(0.84);
  });

  test('доп. мирное завершение срока: честная и волевая победа', () => {
    const loved = makeState('realism', (s) => {
      s.mood.elites = 80; s.mood.military = 80; s.mood.workers = 60; s.mood.youth = 60; // avg 70 >= 66
    });
    expect(resolveTermEnding(loved).id).toBe('reelected');
    expect(resolveTermEnding(loved).multiplier).toBe(1.2);

    const willful = makeState('realism', (s) => {
      s.mood.elites = 30; s.mood.military = 30; s.mood.workers = 30; s.mood.youth = 30; // avg 30
      s.stats.stability = 80; // > 70
    });
    const we = resolveTermEnding(willful);
    expect(we.id).toBe('reelected');
    expect(we.multiplier).toBe(1.1);

    const unpopular = makeState('realism', (s) => {
      s.mood.elites = 10; s.mood.military = 10; s.mood.workers = 10; s.mood.youth = 30; // avg 15 < 25
      s.stats.stability = 90;
    });
    expect(resolveTermEnding(unpopular).id).toBe('peaceful_handover');
  });
});
