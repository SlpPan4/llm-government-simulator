// Регрессия бага языка рана: движок отдаёт нейтральные ключи (закон 2), а все
// строки для игрока (имена соседей, названия ивентов и арок, новости развязок,
// причины концовок) рендерятся из словаря на языке рана. Английский ран не
// должен показывать русские строки ни в панели, ни в новостях, ни в финале.

import { describe, expect, test } from 'vitest';
import {
  arcTitle, baseEventTitle, neighborName, renderArcOutcome, renderChronicleEntry,
  renderEndingDescription, renderHappening,
} from '../i18n.js';
import { checkArcTriggers, advanceArcs, executeAction } from '../engine/triggers.js';
import { validateAction } from '../engine/validator.js';
import { tickWeeks } from '../engine/tick.js';
import { forceEventRng, makeState } from './helpers.js';

describe('язык рана: локализация имён и сообщений движка', () => {
  test('имена соседей на трёх языках; неизвестный id возвращается как есть', () => {
    expect(neighborName('ru', 'north_empire')).toBe('Северная Империя');
    expect(neighborName('uk', 'north_empire')).toBe('Північна Імперія');
    expect(neighborName('en', 'north_empire')).toBe('Northern Empire');
    expect(neighborName('ru', 'kraina')).toBe('Республика Країн');
    expect(neighborName('uk', 'kraina')).toBe('Республіка Країн');
    expect(neighborName('en', 'kraina')).toBe('Republic of Kraina');
    expect(neighborName('en', 'atlantis')).toBe('atlantis');
  });

  test('названия базовых ивентов локализованы по id', () => {
    expect(baseEventTitle('en', 'earthquake')).toBe('Earthquake in the region');
    expect(baseEventTitle('ru', 'military_parade')).toBe('Парад укрепил дух нации');
    expect(baseEventTitle('en', 'unknown_event')).toBe('unknown_event');
  });

  test('жёсткие арки: название по id на языке рана', () => {
    const s = makeState('realism', (x) => { x.mood.workers = 30; x.stats.freedom = 40; });
    const arc = checkArcTriggers(s, false)!;
    expect(arc.kind).toBe('hard');
    expect(arc.title).toBe(''); // заголовок живёт в словаре, а не в состоянии
    expect(arcTitle('en', arc)).toBe('Protests → civil war');
    expect(arcTitle('uk', arc)).toBe('Протести → громадянська війна');
    expect(arcTitle('ru', arc)).toBe('Протесты → гражданская война');
  });

  test('хроника рендерится на языке рана (в т.ч. базовые ивенты)', () => {
    const s = makeState();
    tickWeeks(s, 12, forceEventRng); // гарантированно выпадает earthquake (первый eligible)
    const en = s.chronicle.map((e) => renderChronicleEntry('en', e));
    expect(en.some((l) => l.startsWith('Event: Earthquake in the region'))).toBe(true);
    const ru = s.chronicle.map((e) => renderChronicleEntry('ru', e));
    expect(ru.some((l) => l.startsWith('Событие: Землетрясение в регионе'))).toBe(true);
    // plain-строки из старых сейвов проходят как есть
    expect(renderChronicleEntry('en', 'старая запись')).toBe('старая запись');
    expect(renderArcOutcome('en', 'сошло на нет')).toBe('сошло на нет');
  });

  test('развязка протестов и причина концовки — на языке рана', () => {
    const s = makeState('realism', (x) => { x.mood.workers = 3; x.stats.freedom = 40; x.treasury = -60; });
    checkArcTriggers(s, false); // форс-старт protests со стадии 2
    const happenings = advanceArcs(s);
    expect(happenings[0].kind).toBe('gameOver');
    expect(renderHappening('en', happenings[0].msg)).toBe('Civil war consumed the country.');
    expect(renderHappening('ru', happenings[0].msg)).toBe('Гражданская война поглотила страну.');
    expect(renderEndingDescription('en', s.gameOver!.reason)).toBe('Civil war consumed the country.');
  });

  test('наступательная война: id цели, локализованный заголовок и новости', () => {
    const s = makeState();
    s.mood.military = 70; s.stats.warMood = 40; s.stats.technology = 60; s.treasury = 100;
    executeAction(s, validateAction(
      { summary: 'war', actionType: 'war', warTarget: 'kraina' }, 'realism',
    ));
    const war = s.arcs.find((a) => a.id === 'offensive_war')!;
    expect(war.warTarget).toBe('kraina');
    expect(arcTitle('en', war)).toBe('War: Republic of Kraina');
    const first = advanceArcs(s);
    expect(renderHappening('en', first[0].msg))
      .toBe('⚠ War with Republic of Kraina: the front holds, the treasury melts away.');
    const second = advanceArcs(s); // 35+20+18+10 = 83 > 45 → победа
    expect(renderHappening('en', second[0].msg))
      .toBe('⚠ Victory over Republic of Kraina! Reparations filled the treasury.');
    expect(renderHappening('ru', second[0].msg))
      .toBe('⚠ Победа над Республика Країн! Репарации пополнили казну.'); // имена не склоняются
  });
});
