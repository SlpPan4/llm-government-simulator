// Тесты 2, 6, 7, 8, 9: тик времени и формулы 7.5.

import { describe, expect, test } from 'vitest';
import { makeState, noEventRng } from './helpers.js';
import { tickWeek, tickWeeks } from '../engine/tick.js';
import { addMoodDelta } from '../engine/state.js';
import { validateAction } from '../engine/validator.js';
import { executeAction } from '../engine/triggers.js';

describe('тик времени', () => {
  test('2. тихие 12 недель не приводят к game over', () => {
    const s = makeState();
    const r = tickWeeks(s, 12, noEventRng);
    expect(s.gameOver).toBeNull();
    expect(r.weeksPassed).toBe(12);
    expect(s.week).toBe(13);
  });

  test('6. казна не уходит в NaN при любых эффектах из валидатора', () => {
    const s = makeState();
    const p = validateAction(
      { summary: 'разорить казну', actionType: 'decree', effects: { economy: -1e9, poverty: 1e9 }, treasuryDelta: -1e9 },
      'realism',
    );
    executeAction(s, p);
    expect(Number.isFinite(s.treasury)).toBe(true);
    tickWeeks(s, 12, noEventRng);
    expect(Number.isFinite(s.treasury)).toBe(true);
    expect(Number.isFinite(s.population)).toBe(true);
    expect(Number.isFinite(s.stats.economy)).toBe(true);
  });

  test('7. пояс импичмент (0–4) замораживает рост группы', () => {
    const s = makeState();
    s.mood.workers = 3;
    addMoodDelta(s, 'workers', 100); // любые положительные дельты игнорируются
    expect(s.mood.workers).toBeLessThanOrEqual(4);

    const p = validateAction({ summary: 'подарки рабочим', actionType: 'law', mood: { workers: 15 } }, 'realism');
    executeAction(s, p);
    expect(s.mood.workers).toBeLessThanOrEqual(4);

    addMoodDelta(s, 'workers', -10); // падать — можно
    expect(s.mood.workers).toBeLessThan(3);
    expect(s.impeachmentFrozen.workers).toBe(true);
  });

  test('8. пояс «любовь» ускоряет рост экономики сильнее, чем «ненависть»', () => {
    const love = makeState('realism', (s) => {
      s.mood.elites = 90; s.mood.military = 90; s.mood.workers = 90; s.mood.youth = 90;
    });
    const hate = makeState('realism', (s) => {
      s.mood.elites = 10; s.mood.military = 10; s.mood.workers = 10; s.mood.youth = 10;
    });
    const start = 50;
    expect(love.stats.economy).toBe(start);
    tickWeek(love);
    tickWeek(hate);
    expect(love.stats.economy - start).toBeGreaterThan(hate.stats.economy - start);
  });

  test('9. пояс «недолюбие»: еженедельная просадка economy −0.1 и education −0.05', () => {
    const base = makeState();
    const disliking = makeState('realism', (s) => { s.mood.workers = 30; }); // одна группа в недолюбии

    const bE0 = base.stats.economy, dE0 = disliking.stats.economy;
    const bEd0 = base.stats.education, dEd0 = disliking.stats.education;
    tickWeek(base);
    tickWeek(disliking);

    // у недолюбимой страны экономика растёт слабее на ~0.1+ (ещё и growthMult ниже)
    expect(disliking.stats.economy - dE0).toBeLessThan(base.stats.economy - bE0 - 0.09);
    expect(disliking.stats.education - dEd0).toBeLessThan(base.stats.education - bEd0);
    // сама дельта economy у disliking-страны отрицательна (0.03 роста не перекрывает −0.1 эмиграции)
    expect(disliking.stats.economy - dE0).toBeLessThan(0);
  });
});
