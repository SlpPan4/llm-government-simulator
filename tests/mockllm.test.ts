// Проблема 6: антикоррупционная симметрия MockLLM — процедуры (тендеры,
// публичная отчётность, независимый аудит) снижают коррупцию так же,
// как и репрессии. Иначе у игрока на заглушке нет позитивного инструмента.

import { describe, expect, test } from 'vitest';
import { MockLLM } from '../llm/client.js';
import { makeState } from './helpers.js';

const parse = async (text: string, lang: 'ru' | 'uk' | 'en' = 'ru') =>
  (await new MockLLM(lang, () => 0.5).parseAction(makeState(), text)) as {
    effects: Record<string, number>;
    actionType: string;
    warTarget: string | null;
    impeachmentAmnesty: boolean;
  };

describe('MockLLM: антикоррупционная симметрия', () => {
  test('репрессии снижают коррупцию', async () => {
    expect((await parse('жёсткая антикоррупционная кампания: аресты чиновников')).effects.corruption)
      .toBe(-5);
  });

  test('процедуры снижают коррупцию: тендеры, отчётность, аудит', async () => {
    expect((await parse('внедряю открытые тендеры и публичную отчётность')).effects.corruption)
      .toBe(-5);
    expect((await parse('независимый аудит госзакупок')).effects.corruption).toBe(-5);
    expect((await parse('прозрачные закупки', 'uk')).effects.corruption).toBe(-5);
    expect((await parse('transparent procurement, independent audit', 'en')).effects.corruption)
      .toBe(-5);
  });

  test('нейтральный текст без ключей не трогает коррупцию', async () => {
    const r = await parse('подписываю указ о выходном дне');
    expect(r.effects.corruption ?? 0).toBe(0);
  });

  test('«объявляю войну» (вин. падеж) распознаётся как война', async () => {
    const r = await parse('объявляю войну Республике Країн');
    expect(r.actionType).toBe('war');
    expect(r.warTarget).toBe('kraina'); // стабильный id соседа
  });

  test('проблема 3: «великое примирение» отдаёт флаг impeachmentAmnesty', async () => {
    expect((await parse('великое примирение: амнистия и пакт с элитами')).impeachmentAmnesty)
      .toBe(true);
    expect((await parse('строю дороги и мосты')).impeachmentAmnesty).toBe(false);
  });
});
