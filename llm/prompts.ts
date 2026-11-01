// Промпты LLM (раздел 8 спецификации). Русский язык вывода.
// Статичная часть — всегда в начале промпта, переменные — в конце user-сообщения.

import { CONFIG } from '../engine/config.js';
import { avgMood, bandLabel, bandOf, type GameState } from '../engine/state.js';

export interface NarrateContext {
  actionSummary: string | null;
  turnNotes: string[];
  baseEvent: { id: string; title: string; description?: string } | null;
  cooldownActive: boolean;
}

// Компактная сериализация состояния (только числа).
function compactState(state: GameState): string {
  return JSON.stringify({
    неделя: state.week,
    статы: state.stats,
    настроения: Object.fromEntries(
      Object.entries(state.mood).map(([k, v]) => [k, { значение: v, пояс: bandLabel(bandOf(v)) }]),
    ),
    казна: Math.round(state.treasury * 100) / 100,
    соседи: state.neighbors,
    население_млн: Math.round(state.population * 1000) / 1000,
    бездомность_проц: Math.round(state.homelessness * 100) / 100,
    среднее_настроение: Math.round(avgMood(state) * 10) / 10,
  });
}

function ideologyLine(state: GameState): string {
  const top = Object.entries(state.ideology)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t, n]) => `${t} (${n})`);
  return top.length ? top.join(', ') : 'пока не сформирован';
}

const TONE = {
  realism: 'Режим РЕАЛИЗМ: последствия максимально реалистичны, как в реальном мире. Даже абсурдные действия дают правдоподобные издержки.',
  creative: 'Режим КРЕАТИВИЗМ: играй вместе с игроком — дурацкие действия дают дурацкие, но внутренне логичные последствия; мир реагирует живее и театральнее.',
} as const;

// Парсер действий: свободный текст → строгий JSON эффектов.
export function buildParseActionPrompt(state: GameState, actionText: string): { system: string; user: string } {
  const system = [
    'Ты — аналитический движок политической симуляции. Ты превращаешь действие президента в числовые последствия строгим JSON.',
    TONE[state.mode],
    'Правила: дельты строго в пределах потолков режима; затрагивай 2–4 переменные; даже хорошее действие кому-то не нравится — добавляй и отрицательные реакции; отвечай только валидным JSON без пояснений.',
  ].join('\n');
  const user = [
    'Состояние страны (только числа):',
    compactState(state),
    'Соседи: ' + state.neighbors.map((n) => `${n.name} (сила ${n.strength}, отношения ${n.relations})`).join('; '),
    'Схема ответа: {"summary": string (одно предложение), "actionType": "law"|"decree"|"statement"|"war"|"other", "warTarget": string|null (имя соседа, только для war), "effects": {economy,poverty,unemployment,inflation,freedom,corruption,stability,powerConcentration,education,technology,warMood: number}, "mood": {elites,military,workers,youth: number}, "treasuryDelta": number, "absurdity": 0..100, "ideologyTags": [0–3 тегов]}',
    'Идеологические теги: militarism, pacifism, welfare, austerity, authoritarianism, liberalism, technocracy, traditionalism, nationalism, globalism, ecology, populism.',
    `Действие президента: «${actionText.trim()}»`,
  ].join('\n');
  return { system, user };
}

// Рассказчик: единый JSON — сводка, flavor базового ивента, динамическое событие.
export function buildNarratePrompt(state: GameState, ctx: NarrateContext): { system: string; user: string } {
  const system = [
    'Ты — главный редактор независимой газеты вымышленной страны. Пишешь на русском языке.',
    'Отражай только переданные факты и логические следствия из хроники. Не давай советов президенту.',
    TONE[state.mode],
    'Строгий JSON ответа: {"news": string (заголовок + 2–3 заметки + "Голоса города" — 3 реплики жителей от первого лица, до 250 слов), "baseEventFlavor": null | {"title": string, "description": string}, "dynamicEvent": null | {"title": string, "description": string (1–3 предложения), "effects": {<11 статов>: number}, "mood": {elites,military,workers,youth: number}, "treasuryDelta": number, "newArc": string|null (slug новой кастомной арки), "parentArcId": string|null, "resolvesArc": boolean, "charactersReferenced": [имена из реестра], "newCharacter": null | {"name": string, "role": string}}}.',
    'Правила динамических событий: масштаб «средний», катастроф уровня войн нельзя; логически следуют из хроники; не противоречат завершённым аркам; предпочитай существующих персонажей, новый — не более одного; если кулдаун активен — dynamicEvent обязан быть null.',
  ].join('\n');
  const user = [
    'Состояние страны:',
    compactState(state),
    'Хроника (последние ' + CONFIG.run.chronicleLimit + ' записей):',
    state.chronicle.join('\n') || '(пусто)',
    `Сводные счётчики рана: действий ${state.counters.actions}, базовых ивентов ${state.counters.baseEvents}, динамических событий ${state.counters.dynamicEvents}, арок завершено ${state.counters.arcsFinished}, схлопнуто старых записей хроники ${state.chronicleCollapsed}.`,
    'Активные арки: ' + (state.arcs.map((a) => `${a.title} (стадия ${a.stage})`).join('; ') || 'нет'),
    'Завершённые арки: ' + (state.finishedArcs.map((a) => `${a.title} — ${a.outcome}`).join('; ') || 'нет'),
    'Персонажи: ' + (state.characters.map((c) => `${c.name}, ${c.role}, отношение ${c.attitude}`).join('; ') || 'нет'),
    'Идеологический профиль: ' + ideologyLine(state),
    ctx.baseEvent ? `Выпавший базовый ивент (эффекты фиксированы, перепиши только название и описание): ${ctx.baseEvent.title}` : 'Базовый ивент не выпал.',
    ctx.cooldownActive ? 'КУЛДАУН ДИНАМИЧЕСКИХ СОБЫТИЙ АКТИВЕН: dynamicEvent обязан быть null.' : 'Кулдаун неактивен.',
    ctx.actionSummary ? `Действие президента: ${ctx.actionSummary}` : 'Действия не было.',
    'События хода: ' + (ctx.turnNotes.join('; ') || 'ничего значимого'),
  ].join('\n');
  return { system, user };
}

// Эпилог: «что стало через 10 лет».
export function buildEpiloguePrompt(state: GameState, endingLabel: string, scoreTotal: number): { system: string; user: string } {
  const system = [
    'Ты — историк, пишешь на русском языке.',
    'Напиши эпилог 150–200 слов: что стало со страной и президентом через 10 лет после окончания правления. Тон честный и чуть меланхоличный' + (state.mode === 'creative' ? ', с оглядкой на абсурдность случившегося' : '') + '.',
    'Можешь упоминать персонажей реестра и ключевые события хроники.',
    'Ответь строгим JSON: {"epilogue": string}.',
  ].join('\n');
  const popChange = state.populationStart > 0
    ? ((state.population - state.populationStart) / state.populationStart) * 100
    : 0;
  const user = [
    `Страна: ${state.countryName}. Концовка: ${endingLabel}. Итоговый счёт: ${scoreTotal}.`,
    'Финальное состояние:',
    compactState(state),
    'Хроника:',
    state.chronicle.join('\n') || '(пусто)',
    'Персонажи: ' + (state.characters.map((c) => `${c.name}, ${c.role}`).join('; ') || 'нет'),
    `Население на старте: ${state.populationStart} млн, в конце: ${Math.round(state.population * 1000) / 1000} млн (изменение ${Math.round(popChange * 100) / 100}%).` + (Math.abs(popChange) > 1 ? ' Изменение заметное — обязательно упомяни демографические последствия (рождаемость, эмиграцию, старение).' : ''),
  ].join('\n');
  return { system, user };
}
