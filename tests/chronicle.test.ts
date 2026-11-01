// Тесты 13 и 14: хроника (лимит + сводные счётчики) и реестр персонажей.

import { describe, expect, test } from 'vitest';
import { makeState } from './helpers.js';
import { pushChronicle, addCharacter, findCharacter } from '../engine/chronicle.js';
import { applyDynamicEvent } from '../engine/state.js';
import { validateDynamicEvent } from '../engine/validator.js';
import { CONFIG } from '../engine/config.js';

describe('хроника', () => {
  test('13. хроника не превышает лимит; старые записи схлопываются в счётчики', () => {
    const s = makeState();
    for (let i = 0; i < 20; i++) pushChronicle(s, `запись ${i}`);
    expect(s.chronicle.length).toBe(CONFIG.run.chronicleLimit);
    expect(s.chronicleCollapsed).toBe(20 - CONFIG.run.chronicleLimit);
    expect(s.chronicle[CONFIG.run.chronicleLimit - 1]).toBe('запись 19'); // последние записи сохраняются
    expect(s.chronicle[0]).toBe('запись 5');
  });
});

describe('реестр персонажей', () => {
  test('14. не более 1 нового персонажа за событие; ссылка на существующего по имени', () => {
    const s = makeState();

    // событие с одним новым персонажем
    const evt1 = validateDynamicEvent({
      title: 'Пресс-конференция', description: 'Новая звезда эфира.',
      newCharacter: { name: 'Мария Светлова', role: 'журналистка' },
    });
    expect(evt1).not.toBeNull();
    applyDynamicEvent(s, evt1!);
    expect(s.characters).toHaveLength(1);
    expect(s.characters[0].name).toBe('Мария Светлова');

    // событие ссылается на существующего по имени + добавляет нового
    const evt2 = validateDynamicEvent({
      title: 'Интервью', description: 'Мария берёт интервью у депутата.',
      charactersReferenced: ['мария светлова'], // регистронезависимый поиск
      newCharacter: { name: 'Пётр Громов', role: 'депутат' },
    })!;
    applyDynamicEvent(s, evt2);
    expect(s.characters).toHaveLength(2);
    expect(findCharacter(s, 'МАРИЯ СВЕТЛОВА')).toBeDefined();

    // повтор того же персонажа не создаёт дубликат
    const evt3 = validateDynamicEvent({
      title: 'Скандал', description: 'Допрос в парламенте.',
      newCharacter: { name: 'Мария Светлова', role: 'свидетель' },
    })!;
    applyDynamicEvent(s, evt3);
    expect(s.characters.filter((c) => c.name === 'Мария Светлова')).toHaveLength(1);

    // прямой addCharacter тоже не дублирует
    expect(addCharacter(s, 'Пётр Громов', 'оппозиционер')).toBeNull();
    expect(s.characters).toHaveLength(2);
  });
});
