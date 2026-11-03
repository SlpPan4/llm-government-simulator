// Тесты 7.8.1: дедупликация кастомных арок по названию, нормализация id,
// рост стадий при продолжении.

import { describe, expect, it } from 'vitest';
import { applyDynamicEvent, makeArc, normalizeArcId } from '../engine/state.js';
import type { ValidatedDynamicEvent } from '../engine/validator.js';
import { makeState } from './helpers.js';

function evt(partial: Partial<ValidatedDynamicEvent> & { title: string }): ValidatedDynamicEvent {
  return {
    description: '',
    effects: {},
    mood: {},
    treasuryDelta: 0,
    newArc: null,
    parentArcId: null,
    resolvesArc: false,
    charactersReferenced: [],
    newCharacter: null,
    ...partial,
  };
}

describe('Тест 7.8.1: нормализация id арок', () => {
  it('«Студенческий призыв: первый набор» → студенческий_призыв_первый_набор', () => {
    expect(normalizeArcId('Студенческий призыв: первый набор'))
      .toBe('студенческий_призыв_первый_набор');
  });

  it('обрезает подчёркивания по краям и схлопывает разделители', () => {
    expect(normalizeArcId('  --Арка № 2!! ')).toBe('арка_2');
  });
});

describe('Тест 7.8.1: дедупликация арок', () => {
  it('newArc с названием активной арки не создаёт дубль, а повышает стадию', () => {
    const s = makeState();
    makeArc(s, { id: 'кулинарный_бунт', title: 'Студенческий призыв: первый набор', kind: 'custom' });
    applyDynamicEvent(s, evt({ title: 'Студенческий призыв: первый набор', newArc: 'student_draft' }));
    expect(s.arcs).toHaveLength(1);
    expect(s.arcs[0].stage).toBe(1);
  });

  it('дедуп не зависит от регистра и пробелов', () => {
    const s = makeState();
    makeArc(s, { id: 'a', title: 'Студенческий призыв: первый набор', kind: 'custom' });
    applyDynamicEvent(s, evt({ title: '  студенческий призыв: первый набор ', newArc: 'x' }));
    expect(s.arcs).toHaveLength(1);
    expect(s.arcs[0].stage).toBe(1);
  });

  it('явное продолжение по parentArcId повышает стадию с потолком 5', () => {
    const s = makeState();
    const arc = makeArc(s, { id: 'a', title: 'Арка', kind: 'custom', stage: 4 });
    applyDynamicEvent(s, evt({ title: 'Развитие', parentArcId: 'a' }));
    expect(arc.stage).toBe(5);
    applyDynamicEvent(s, evt({ title: 'Ещё развитие', parentArcId: 'a' }));
    expect(arc.stage).toBe(5);
  });

  it('пустой newArc генерит id из названия', () => {
    const s = makeState();
    applyDynamicEvent(s, evt({ title: 'Кулинарный бунт', newArc: '!!!' }));
    expect(s.arcs).toHaveLength(1);
    expect(s.arcs[0].id).toBe('кулинарный_бунт');
  });

  it('resolvesArc по арке из дедупа закрывает существующую арку', () => {
    const s = makeState();
    makeArc(s, { id: 'a', title: 'Студенческий призыв: первый набор', kind: 'custom' });
    applyDynamicEvent(s, evt({
      title: 'Студенческий призыв: первый набор', newArc: 'x', resolvesArc: true,
    }));
    expect(s.arcs).toHaveLength(0);
    expect(s.finishedArcs).toHaveLength(1);
  });

  it('resolvesArc по жёсткой арке её НЕ закрывает — развязку жёстких держит движок (7.7)', () => {
    const s = makeState();
    makeArc(s, { id: 'coup', title: 'Военный переворот', kind: 'hard', stage: 1 });
    applyDynamicEvent(s, evt({ title: 'Генералы колеблются', parentArcId: 'coup', resolvesArc: true }));
    expect(s.arcs).toHaveLength(1);
    expect(s.arcs[0].stage).toBe(1);
    expect(s.finishedArcs).toHaveLength(0);
  });

  it('продолжение по parentArcId не двигает стадию жёсткой арки', () => {
    const s = makeState();
    makeArc(s, { id: 'oligarchs', title: 'Олигархи', kind: 'hard', stage: 0 });
    applyDynamicEvent(s, evt({ title: 'Олигархи гудят за кулисами', parentArcId: 'oligarchs' }));
    expect(s.arcs[0].stage).toBe(0);
    expect(s.chronicle.some((c) => typeof c !== 'string' && c.k === 'arcBackground')).toBe(true);
  });
});
