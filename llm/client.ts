// Интерфейс LLM + DeepSeekLLM (openai SDK, меняется только baseURL) + MockLLM
// + фабрика createLLM(). Движок этого слоя не импортирует (закон 2).

import OpenAI from 'openai';
import type { GameState } from '../engine/state.js';
import { buildEpiloguePrompt, buildNarratePrompt, buildParseActionPrompt, type NarrateContext } from './prompts.js';

export interface LLM {
  // Сырой JSON парсера действий — дальше работает валидатор движка.
  parseAction(state: GameState, actionText: string): Promise<unknown>;
  // Единый ответ narrate: news + baseEventFlavor + dynamicEvent.
  narrate(state: GameState, ctx: NarrateContext): Promise<unknown>;
  // Готовый текст эпилога.
  epilogue(state: GameState, endingLabel: string, scoreTotal: number): Promise<string>;
}

// Нормализация действия для кэша: trim + lowercase (закон 6).
export function normalizeAction(text: string): string {
  return text.trim().toLowerCase();
}

function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
}

// Одинаковые действия не уходят в API повторно.
class CachedLLM implements LLM {
  private cache = new Map<string, Promise<unknown>>();

  constructor(private inner: LLM) {}

  parseAction(state: GameState, actionText: string): Promise<unknown> {
    const key = normalizeAction(actionText);
    const hit = this.cache.get(key);
    if (hit) return hit;
    const pending = this.inner.parseAction(state, actionText);
    this.cache.set(key, pending);
    pending.catch(() => this.cache.delete(key)); // не кэшируем провал
    return pending;
  }

  narrate(state: GameState, ctx: NarrateContext): Promise<unknown> {
    return this.inner.narrate(state, ctx);
  }

  epilogue(state: GameState, endingLabel: string, scoreTotal: number): Promise<string> {
    return this.inner.epilogue(state, endingLabel, scoreTotal);
  }
}

export class DeepSeekLLM implements LLM {
  private client: OpenAI;

  constructor(apiKey: string, baseURL: string, private model: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  private async chat(system: string, user: string): Promise<unknown> {
    try {
      const res = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.7,
      });
      const text = res.choices[0]?.message?.content ?? '';
      return JSON.parse(stripCodeFences(text));
    } catch {
      return null; // сеть/парсинг упали — нейтральный результат решает валидатор
    }
  }

  parseAction(state: GameState, actionText: string): Promise<unknown> {
    const p = buildParseActionPrompt(state, actionText);
    return this.chat(p.system, p.user);
  }

  narrate(state: GameState, ctx: NarrateContext): Promise<unknown> {
    const p = buildNarratePrompt(state, ctx);
    return this.chat(p.system, p.user);
  }

  async epilogue(state: GameState, endingLabel: string, scoreTotal: number): Promise<string> {
    const p = buildEpiloguePrompt(state, endingLabel, scoreTotal);
    const raw = await this.chat(p.system, p.user);
    if (raw && typeof raw === 'object' && typeof (raw as { epilogue?: unknown }).epilogue === 'string') {
      return (raw as { epilogue: string }).epilogue;
    }
    return 'История ещё напишет об этом правлении — пока рано подводить итоги.';
  }
}

// Заглушка: эвристика по ключевым словам, игра полностью работает без API.
export class MockLLM implements LLM {
  constructor(private rng: () => number = Math.random) {}

  async parseAction(state: GameState, actionText: string): Promise<unknown> {
    const t = actionText.trim().toLowerCase();
    const has = (...ws: string[]) => ws.some((w) => t.includes(w));
    const effects: Record<string, number> = {};
    const mood: Record<string, number> = {};
    const tags: string[] = [];
    let treasuryDelta = 0;
    let absurdity = 10 + Math.floor(this.rng() * 15);
    let actionType = 'other';
    let warTarget: string | null = null;

    if (has('война', 'вторг', 'атаковать', 'бомбить', 'ударить по', 'объявить войну')) {
      actionType = 'war';
      const n = state.neighbors.find((x) =>
        t.includes(x.name.toLowerCase())
        || x.name.toLowerCase().split(/\s+/).some((w) => w.length > 3 && t.includes(w)));
      warTarget = n ? n.name : (state.neighbors[0]?.name ?? null);
      tags.push('militarism');
    }
    if (has('образован', 'школ', 'университет', 'наук')) {
      effects.education = 6; effects.technology = 3; effects.economy = 2;
      mood.workers = 2; tags.push('technocracy');
    }
    if (has('медицин', 'здравоохран', 'льгот', 'пособи', 'пенси')) {
      effects.economy = 2; mood.workers = 5; mood.elites = -2;
      treasuryDelta -= 6; tags.push('welfare');
    }
    if (has('налог', 'сбор')) {
      effects.economy = 3; mood.workers = -6; mood.elites = 3; tags.push('austerity');
    }
    if (has('свобод', 'цензур')) {
      effects.freedom = 6; mood.youth = 5; tags.push('liberalism');
    }
    if (has('запрет', 'запреща')) {
      effects.freedom = -5; mood.youth = -4; tags.push('authoritarianism');
    }
    if (has('арми', 'военн', 'оружи', 'флот', 'призыв')) {
      effects.warMood = 6; effects.stability = 2; mood.military = 6; mood.youth = -3;
      treasuryDelta -= 5; tags.push('militarism');
    }
    if (has('коррупц')) {
      effects.corruption = -5; mood.workers = 3;
    }
    if (has('инфраструктур', 'дорог', 'мост', 'строительств', 'жиль')) {
      effects.economy = 4; effects.poverty = -2; treasuryDelta -= 8;
    }
    if (has('эколог', 'природ', 'лес', 'заповедник')) {
      effects.technology = 2; mood.youth = 4; tags.push('ecology');
    }
    if (has('церков', 'традиц', 'религи')) {
      mood.elites = 4; mood.youth = -2; tags.push('traditionalism');
    }
    if (has('единорог', 'радуга', 'клоун', 'конфетти', 'плюшев', 'обезьян', 'пицц')) {
      absurdity = 70 + Math.floor(this.rng() * 25);
      mood.workers = (mood.workers ?? 0) + 3;
      mood.youth = (mood.youth ?? 0) + 6;
      effects.economy = 3; effects.stability = -2;
      tags.push('populism');
    }
    if (Object.keys(effects).length === 0 && actionType !== 'war') {
      // нейтральное действие без явных ключей
      effects.economy = Math.floor(this.rng() * 5) - 1;
      effects.stability = Math.floor(this.rng() * 3);
      mood.workers = Math.floor(this.rng() * 5) - 2;
      absurdity = Math.min(absurdity, 30);
    }

    const summary = actionType === 'war'
      ? `Президент объявляет войну: ${warTarget}.`
      : `Правительство запускает инициативу «${actionText.trim()}»; последствия ощущаются в обществе.`;

    return {
      summary,
      actionType,
      warTarget,
      effects,
      mood,
      treasuryDelta,
      absurdity,
      ideologyTags: [...new Set(tags)].slice(0, 3),
    };
  }

  async narrate(state: GameState, ctx: NarrateContext): Promise<unknown> {
    const notes = ctx.turnNotes.length ? ctx.turnNotes.join('; ') : 'особых событий не было';
    const news = [
      `«${state.countryName}», неделя ${state.week}.`,
      ctx.actionSummary ? `Главная тема: ${ctx.actionSummary}.` : 'Неделя прошла без громких решений.',
      `Итоги периода: ${notes}.`,
      'Голоса города: «Надеемся на лучшее», «Политика — грязное дело», «Главное — стабильность».',
    ].join(' ');
    const baseEventFlavor = ctx.baseEvent
      ? {
          title: `${ctx.baseEvent.title} — подробности`,
          description: `Корреспонденты разбираются в ситуации: «${ctx.baseEvent.title.toLowerCase()}». Власти пока воздерживаются от комментариев.`,
        }
      : null;

    let dynamicEvent = null;
    if (!ctx.cooldownActive && this.rng() < 0.25) {
      // иногда подбрасываем простое событие, чтобы прокачать пайплайн
      dynamicEvent = {
        title: 'Слухи в торговых рядах',
        description: 'Купцы обсуждают перемены и ждут ясности от правительства.',
        effects: { economy: 2 },
        mood: {},
        treasuryDelta: 0,
        newArc: null,
        parentArcId: null,
        resolvesArc: false,
        charactersReferenced: state.characters.slice(0, 1).map((c) => c.name),
        newCharacter: null,
      };
    }

    return { news, baseEventFlavor, dynamicEvent };
  }

  async epilogue(state: GameState, endingLabel: string, scoreTotal: number): Promise<string> {
    return [
      `Прошло десять лет. ${state.countryName} помнит это правление — иначе, чем ожидали.`,
      `Концовка: ${endingLabel}. Историки спорят, была ли цена оправдана, а население (${state.population.toFixed(1)} млн против ${state.populationStart.toFixed(1)} млн на старте) просто живёт дальше.`,
      `Счёт историков: ${scoreTotal}.`,
    ].join(' ');
  }
}

// Фабрика: USE_MOCK_LLM=true → заглушка без API; иначе DeepSeek + кэш действий.
export function createLLM(): LLM {
  if (process.env.USE_MOCK_LLM === 'true') {
    return new MockLLM();
  }
  const apiKey = process.env.DEEPSEEK_API_KEY ?? '';
  const baseURL = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
  const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';
  return new CachedLLM(new DeepSeekLLM(apiKey, baseURL, model));
}
