// LLM interface + DeepSeekLLM (openai SDK, only baseURL differs) + MockLLM
// + createLLM() factory. The engine never imports this layer (law 2).

import OpenAI from 'openai';
import type { GameState } from '../engine/state.js';
import { MOCK_STRINGS, PROMPT_STRINGS, type UiLanguage } from '../i18n.js';
import {
  buildEpiloguePrompt, buildNarratePrompt, buildParseActionPrompt, type NarrateContext,
} from './prompts.js';

export interface LLM {
  // Raw action-parser JSON — the engine validator takes it from here.
  parseAction(state: GameState, actionText: string): Promise<unknown>;
  // Single narrate answer: news + baseEventFlavor + dynamicEvent.
  narrate(state: GameState, ctx: NarrateContext): Promise<unknown>;
  // Ready epilogue text.
  epilogue(state: GameState, endingLabel: string, scoreTotal: number): Promise<string>;
}

// Action normalization for the cache: trim + lowercase (law 6).
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

// Identical actions are not sent to the API twice.
class CachedLLM implements LLM {
  private cache = new Map<string, Promise<unknown>>();

  constructor(private inner: LLM) {}

  parseAction(state: GameState, actionText: string): Promise<unknown> {
    const key = normalizeAction(actionText);
    const hit = this.cache.get(key);
    if (hit) return hit;
    const pending = this.inner.parseAction(state, actionText);
    this.cache.set(key, pending);
    pending.catch(() => this.cache.delete(key)); // do not cache failures
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

  constructor(
    apiKey: string,
    baseURL: string,
    private model: string,
    private lang: UiLanguage,
  ) {
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
      return null; // network/parse failure — the validator decides a neutral result
    }
  }

  parseAction(state: GameState, actionText: string): Promise<unknown> {
    const p = buildParseActionPrompt(state, actionText, this.lang);
    return this.chat(p.system, p.user);
  }

  narrate(state: GameState, ctx: NarrateContext): Promise<unknown> {
    const p = buildNarratePrompt(state, ctx, this.lang);
    return this.chat(p.system, p.user);
  }

  async epilogue(state: GameState, endingLabel: string, scoreTotal: number): Promise<string> {
    const p = buildEpiloguePrompt(state, endingLabel, scoreTotal, this.lang);
    const raw = await this.chat(p.system, p.user);
    if (raw && typeof raw === 'object' && typeof (raw as { epilogue?: unknown }).epilogue === 'string') {
      return (raw as { epilogue: string }).epilogue;
    }
    return PROMPT_STRINGS[this.lang].fallbackEpilogue;
  }
}

// Stub: keyword heuristics; the game fully works without an API.
// Stubs answer in the run language; keywords match all three languages.
export class MockLLM implements LLM {
  constructor(
    private lang: UiLanguage,
    private rng: () => number = Math.random,
  ) {}

  async parseAction(state: GameState, actionText: string): Promise<unknown> {
    const t = MOCK_STRINGS[this.lang];
    const text = actionText.trim().toLowerCase();
    const has = (...ws: string[]) => ws.some((w) => text.includes(w));
    const effects: Record<string, number> = {};
    const mood: Record<string, number> = {};
    const tags: string[] = [];
    let treasuryDelta = 0;
    let absurdity = 10 + Math.floor(this.rng() * 15);
    let actionType = 'other';
    let warTarget: string | null = null;

    if (has('война', 'вторг', 'атаковать', 'бомбить', 'ударить по', 'объявить войну',
      'війн', 'вторгн', 'атакуват', 'бомб',
      'war', 'invade', 'attack', 'bomb', 'declare war')) {
      actionType = 'war';
      const n = state.neighbors.find((x) =>
        text.includes(x.name.toLowerCase())
        || x.name.toLowerCase().split(/\s+/).some((w) => w.length > 3 && text.includes(w)));
      warTarget = n ? n.name : (state.neighbors[0]?.name ?? null);
      tags.push('militarism');
    }
    if (has('образован', 'школ', 'университет', 'наук',
      'освіт', 'універс', 'educat', 'school', 'universit', 'scienc')) {
      effects.education = 6; effects.technology = 3; effects.economy = 2;
      mood.workers = 2; tags.push('technocracy');
    }
    if (has('медицин', 'здравоохран', 'льгот', 'пособи', 'пенси',
      'медицин', 'здоров', 'пенсі', 'льгот',
      'medic', 'health', 'pension', 'welfare', 'benefit')) {
      effects.economy = 2; mood.workers = 5; mood.elites = -2;
      treasuryDelta -= 6; tags.push('welfare');
    }
    if (has('налог', 'сбор', 'податк', 'tax')) {
      effects.economy = 3; mood.workers = -6; mood.elites = 3; tags.push('austerity');
    }
    if (has('свобод', 'цензур', 'freedom', 'censor')) {
      effects.freedom = 6; mood.youth = 5; tags.push('liberalism');
    }
    if (has('запрет', 'запреща', 'заборон', 'ban', 'forbid', 'prohibit')) {
      effects.freedom = -5; mood.youth = -4; tags.push('authoritarianism');
    }
    if (has('арми', 'военн', 'оружи', 'флот', 'призыв',
      'армі', 'військ', 'збро', 'army', 'military', 'weapon', 'navy', 'fleet', 'conscript')) {
      effects.warMood = 6; effects.stability = 2; mood.military = 6; mood.youth = -3;
      treasuryDelta -= 5; tags.push('militarism');
    }
    if (has('коррупц', 'корупц', 'corrupt')) {
      effects.corruption = -5; mood.workers = 3;
    }
    if (has('инфраструктур', 'дорог', 'мост', 'строительств', 'жиль',
      'інфраструктур', 'доріг', 'міст', 'будівництв', 'житл',
      'infrastruct', 'road', 'bridge', 'construct', 'hous')) {
      effects.economy = 4; effects.poverty = -2; treasuryDelta -= 8;
    }
    if (has('эколог', 'природ', 'лес', 'заповедник',
      'еколог', 'ліс', 'заповідник', 'ecolog', 'nature', 'forest')) {
      effects.technology = 2; mood.youth = 4; tags.push('ecology');
    }
    if (has('церков', 'традиц', 'религи', 'церков', 'реліг',
      'church', 'tradition', 'religio')) {
      mood.elites = 4; mood.youth = -2; tags.push('traditionalism');
    }
    if (has('единорог', 'радуга', 'клоун', 'конфетти', 'плюшев', 'обезьян', 'пицц',
      'єдиноріг', 'веселк', 'клоун', 'плюшев', 'мавп', 'піц',
      'unicorn', 'rainbow', 'clown', 'confetti', 'plush', 'monkey', 'pizza')) {
      absurdity = 70 + Math.floor(this.rng() * 25);
      mood.workers = (mood.workers ?? 0) + 3;
      mood.youth = (mood.youth ?? 0) + 6;
      effects.economy = 3; effects.stability = -2;
      tags.push('populism');
    }
    if (Object.keys(effects).length === 0 && actionType !== 'war') {
      // neutral action without explicit keywords
      effects.economy = Math.floor(this.rng() * 5) - 1;
      effects.stability = Math.floor(this.rng() * 3);
      mood.workers = Math.floor(this.rng() * 5) - 2;
      absurdity = Math.min(absurdity, 30);
    }

    const summary = actionType === 'war'
      ? t.warSummary(warTarget ?? '')
      : t.defaultSummary(actionText.trim());

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
    const t = MOCK_STRINGS[this.lang];
    const notes = ctx.turnNotes.length ? ctx.turnNotes.join('; ') : t.noNotes;
    const news = [
      t.newsWeek(state.countryName, state.week),
      ctx.actionSummary ? t.newsMainAction(ctx.actionSummary) : t.newsNoAction,
      t.newsNotes(notes),
      t.newsVoices,
    ].join(' ');
    const baseEventFlavor = ctx.baseEvent
      ? {
          title: `${ctx.baseEvent.title} ${t.flavorSuffix}`,
          description: t.flavorDescription(ctx.baseEvent.title.toLowerCase()),
        }
      : null;

    let dynamicEvent = null;
    if (!ctx.cooldownActive && this.rng() < 0.25) {
      // occasionally throw a simple event to exercise the pipeline
      dynamicEvent = {
        title: t.dynTitle,
        description: t.dynDescription,
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
    const t = MOCK_STRINGS[this.lang];
    return t.epilogue(
      state.countryName,
      endingLabel,
      state.population.toFixed(1),
      state.populationStart.toFixed(1),
      scoreTotal,
    );
  }
}

// Factory: USE_MOCK_LLM=true -> offline stub; otherwise DeepSeek + action cache.
export function createLLM(lang: UiLanguage = 'ru'): LLM {
  if (process.env.USE_MOCK_LLM === 'true') {
    return new MockLLM(lang);
  }
  const apiKey = process.env.DEEPSEEK_API_KEY ?? '';
  const baseURL = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
  const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';
  return new CachedLLM(new DeepSeekLLM(apiKey, baseURL, model, lang));
}
