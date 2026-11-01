// Тест 15: производные показатели — эмиграция, жилищный пузырь,
// отбрасывание производных ключей валидатором.

import { describe, expect, test } from 'vitest';
import { makeState, noEventRng } from './helpers.js';
import { tickWeek, tickWeeks } from '../engine/tick.js';
import { validateAction } from '../engine/validator.js';

describe('производные показатели', () => {
  test('15а. эмиграция уменьшает population и сборы в казну', () => {
    // три группы в поясе «недолюбие» — сильная эмиграция
    const emigrant = makeState('realism', (s) => {
      s.mood.workers = 30; s.mood.youth = 30; s.mood.elites = 30;
    });
    const calm = makeState();
    tickWeeks(emigrant, 8, noEventRng);
    tickWeeks(calm, 8, noEventRng);

    expect(emigrant.population).toBeLessThan(calm.population); // население тает
    expect(emigrant.treasury).toBeLessThan(calm.treasury); // сборы падают: экономика проседает
    expect(emigrant.stats.economy).toBeLessThan(calm.stats.economy);
  });

  test('15б. housingBubble лопается при падении экономики', () => {
    const s = makeState('realism', (x) => {
      x.housingBubble = 20;
      x.stats.economy = 50; // < 55, пузырь > 15
      x.treasury = 100;
    });
    tickWeek(s);
    expect(s.housingBubble).toBe(0);
    expect(s.stats.economy).toBeLessThan(50); // разово −10
    expect(s.treasury).toBeLessThan(100); // разово −15
  });

  test('15в. валидатор отбрасывает ключи homelessness/population/housingBubble', () => {
    const p = validateAction(
      {
        summary: 'x',
        actionType: 'law',
        effects: { homelessness: 10, population: 5, housingBubble: 3, economy: 5 },
      },
      'realism',
    );
    expect(Object.keys(p.effects)).toEqual(['economy']);
    expect(p.effects.economy).toBe(5);
  });
});
