// Тесты 13: язык и сеттинг в промптах LLM.
// Сеттинг — первая строка user-сообщения каждого вызова; ключи схемы
// остаются английскими при любом языке; MockLLM пишет на языке рана.

import { describe, expect, test } from 'vitest';
import {
  buildEpiloguePrompt, buildNarratePrompt, buildParseActionPrompt, type NarrateContext,
} from '../llm/prompts.js';
import { MockLLM } from '../llm/client.js';
import { PROMPT_STRINGS, UI_LANGUAGES, UI_STRINGS } from '../i18n.js';
import { makeState } from './helpers.js';

const SETTING = 'киберпанк 2087';

const makeRunState = () => makeState('realism', (s) => { s.setting = SETTING; });

const narrateCtx = (): NarrateContext => ({
  actionSummary: null,
  turnNotes: [],
  baseEvent: null,
  cooldownActive: true,
});

describe('сеттинг в промптах', () => {
  test('13а. сеттинг — первая строка user-сообщения каждого вызова LLM', () => {
    const s = makeRunState();
    const prompts = [
      buildParseActionPrompt(s, 'национализировать небо', 'ru'),
      buildNarratePrompt(s, narrateCtx(), 'ru'),
      buildEpiloguePrompt(s, 'reelected', 120, 'ru'),
    ];
    for (const p of prompts) {
      expect(p.user.split('\n')[0]).toBe(`Сеттинг: ${SETTING}`);
    }
  });

  test('13б. строка сеттинга локализована вместе с языком рана', () => {
    const s = makeRunState();
    expect(buildParseActionPrompt(s, 'x', 'uk').user.split('\n')[0]).toBe(`Сеттінг: ${SETTING}`);
    expect(buildParseActionPrompt(s, 'x', 'en').user.split('\n')[0]).toBe(`Setting: ${SETTING}`);
  });

  test('13в. пустой сеттинг → умолчание на языке рана', () => {
    const s = makeState(); // setting = ''
    expect(buildParseActionPrompt(s, 'x', 'ru').user.split('\n')[0])
      .toBe(`Сеттинг: ${UI_STRINGS.ru.defaultSetting}`);
    expect(buildNarratePrompt(s, narrateCtx(), 'en').user.split('\n')[0])
      .toBe(`Setting: ${UI_STRINGS.en.defaultSetting}`);
    expect(buildEpiloguePrompt(s, 'overthrown', 50, 'uk').user.split('\n')[0])
      .toBe(`Сеттінг: ${UI_STRINGS.uk.defaultSetting}`);
  });
});

describe('язык в промптах', () => {
  test('13г. ключи схемы английские при любом языке, инструкции на месте', () => {
    const s = makeRunState();
    const parseKeys = ['"summary"', '"actionType"', '"warTarget"', '"effects"', '"mood"',
      '"treasuryDelta"', '"absurdity"', '"ideologyTags"'];
    const narrateKeys = ['"news"', '"baseEventFlavor"', '"dynamicEvent"', '"newArc"',
      '"parentArcId"', '"resolvesArc"', '"charactersReferenced"', '"newCharacter"'];
    for (const lang of UI_LANGUAGES) {
      const parse = buildParseActionPrompt(s, 'война', lang);
      for (const k of parseKeys) expect(parse.system).toContain(k);
      const narrate = buildNarratePrompt(s, narrateCtx(), lang);
      for (const k of narrateKeys) expect(narrate.system).toContain(k);
      const epilogue = buildEpiloguePrompt(s, 'overthrown', 50, lang);
      expect(epilogue.system).toContain('"epilogue"');
      // инструкция о непереводимости ключей — дословно из словаря
      expect(parse.system).toContain(PROMPT_STRINGS[lang].keysEnglish);
      // инструкция языка вывода
      expect(narrate.system).toContain(PROMPT_STRINGS[lang].writeIn);
      // инструкция о границах сеттинга
      expect(epilogue.system).toContain(PROMPT_STRINGS[lang].settingRule);
    }
  });

  test('13д. системные инструкции собираются на языке рана', () => {
    const s = makeRunState();
    expect(buildParseActionPrompt(s, 'x', 'ru').system).toContain('русском языке');
    expect(buildParseActionPrompt(s, 'x', 'uk').system).toContain('українською мовою');
    expect(buildParseActionPrompt(s, 'x', 'en').system).toContain('in English');
  });
});

describe('MockLLM и язык', () => {
  test('13е. строки заглушки — на языке рана', async () => {
    const s = makeState();
    const enEpilogue = await new MockLLM('en', () => 0.5).epilogue(s, 'reelected', 100);
    const ruEpilogue = await new MockLLM('ru', () => 0.5).epilogue(s, 'reelected', 100);
    expect(enEpilogue).toContain('Ten years have passed');
    expect(ruEpilogue).toContain('Прошло десять лет');
    const ukNews = (await new MockLLM('uk', () => 0.5).narrate(s, narrateCtx())) as { news: string };
    expect(ukNews.news).toContain('тиждень');
    const enSummary = (await new MockLLM('en', () => 0.5).parseAction(s, 'raise pensions')) as { summary: string };
    expect(enSummary.summary).toContain('initiative');
  });
});
