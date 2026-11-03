// Тесты 1 и 12: валидатор (клэмпинг по потолкам, мусор → нейтраль).

import { describe, expect, test } from 'vitest';
import { validateAction, validateDynamicEvent } from '../engine/validator.js';

describe('валидатор действий', () => {
  test('1а. клэмпит −9000 до потолков режима (realism)', () => {
    const p = validateAction(
      {
        summary: 'Всё сломать',
        actionType: 'law',
        effects: { economy: -9000 },
        mood: { workers: -9000, youth: 9000 },
        treasuryDelta: -9999,
        absurdity: 500,
      },
      'realism',
    );
    expect(p.ok).toBe(true);
    expect(p.effects.economy).toBe(-20); // потолок stat realism
    expect(p.mood.workers).toBe(-15); // потолок mood realism
    expect(p.mood.youth).toBe(15);
    expect(p.treasuryDelta).toBe(-50);
    expect(p.absurdity).toBe(100);
  });

  test('1б. потолки creative выше (±30/±20/±75), негатив mood ×0.7', () => {
    const p = validateAction(
      { summary: 's', actionType: 'decree', effects: { economy: -9000 }, mood: { workers: -9000 }, treasuryDelta: -9999 },
      'creative',
    );
    expect(p.effects.economy).toBe(-30);
    expect(p.treasuryDelta).toBe(-75);
    // экстремум клэмпится до потолка mood ±20 (×0.7 не пробивает потолок)
    expect(p.mood.workers).toBe(-20);
    // средние негативные дельты смягчаются ×0.7
    const soft = validateAction({ summary: 's', mood: { workers: -10, youth: 10 } }, 'creative');
    expect(soft.mood.workers).toBeCloseTo(-7);
    expect(soft.mood.youth).toBe(10); // позитив не смягчается
  });

  test('1в. мусор → нейтральный результат без падения', () => {
    for (const garbage of [null, undefined, 'строка', 42, { actionType: 'law', effects: 'не-объект' }, [1, 2, 3]]) {
      const p = validateAction(garbage, 'realism');
      expect(p.ok).toBe(false);
      expect(typeof p.summary).toBe('string');
      expect(p.treasuryDelta).toBe(0);
      expect(Object.keys(p.effects)).toHaveLength(0);
    }
  });

  test('проблема 3: impeachmentAmnesty проходит, не-булево → false', () => {
    expect(validateAction({ summary: 'x', impeachmentAmnesty: true }, 'realism').impeachmentAmnesty)
      .toBe(true);
    expect(validateAction({ summary: 'x', impeachmentAmnesty: 'да' }, 'realism').impeachmentAmnesty)
      .toBe(false);
    expect(validateAction({ summary: 'x' }, 'realism').impeachmentAmnesty).toBe(false);
  });

  test('проблема 5: treasuryNote проходит, обрезается до 80, мусор → null', () => {
    expect(validateAction({ summary: 'x', treasuryNote: 'субсидии армии' }, 'realism').treasuryNote)
      .toBe('субсидии армии');
    expect(validateAction({ summary: 'x', treasuryNote: 'a'.repeat(200) }, 'realism').treasuryNote)
      .toHaveLength(80);
    expect(validateAction({ summary: 'x', treasuryNote: 5 }, 'realism').treasuryNote).toBeNull();
    expect(validateAction({ summary: 'x' }, 'realism').treasuryNote).toBeNull();
  });
});

describe('валидатор динамических событий', () => {
  test('12а. динамическое событие клэмпится по ужатым потолкам 7.4.1', () => {
    const evt = validateDynamicEvent({
      title: 'Слухи',
      description: 'Текст',
      effects: { economy: 50, warMood: -30 },
      mood: { youth: -40 },
      treasuryDelta: 100,
    });
    expect(evt).not.toBeNull();
    expect(evt!.effects.economy).toBe(10); // ±10
    expect(evt!.effects.warMood).toBe(-10);
    expect(evt!.mood.youth).toBe(-10); // ±10
    expect(evt!.treasuryDelta).toBe(20); // ±20
  });

  test('12б. мусорное dynamicEvent игнорируется без падения', () => {
    expect(validateDynamicEvent('мусор')).toBeNull();
    expect(validateDynamicEvent(null)).toBeNull();
    expect(validateDynamicEvent({ description: 'без заголовка' })).toBeNull();
    expect(validateDynamicEvent({ title: '   ' })).toBeNull();
    expect(validateDynamicEvent({ title: 'ok', effects: { economy: 'пять' } })).not.toBeNull();
  });
});
