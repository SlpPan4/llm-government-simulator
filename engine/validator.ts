// Валидатор (Zod) — предохранитель между LLM и движком (закон 4).
// Сырой выхлоп → схема → клэмпинг до потолков конфига → безопасный объект.
// Битый ответ = нейтральный результат, игра не падает.

import { z } from 'zod';
import {
  ACTION_TYPES, CONFIG, IDEOLOGY_TAGS, MOOD_KEYS, STAT_KEYS, clamp,
  type ActionType, type GameMode, type IdeologyTag, type MoodKey, type StatKey,
} from './config.js';

const statKeySet = new Set<string>(STAT_KEYS);
const moodKeySet = new Set<string>(MOOD_KEYS);
const ideologySet = new Set<string>(IDEOLOGY_TAGS);

// Толерантные записи: отбрасываем нечисловые значения по ключам, а не весь ответ.
const looseRecord = z.record(z.string(), z.unknown());

const actionSchema = z.object({
  summary: z.string().optional(),
  actionType: z.enum(ACTION_TYPES).optional(),
  warTarget: z.string().nullable().optional(),
  effects: looseRecord.optional(),
  mood: looseRecord.optional(),
  treasuryDelta: z.number().optional(),
  treasuryNote: z.string().nullable().optional(),
  absurdity: z.number().optional(),
  ideologyTags: z.array(z.string()).optional(),
  impeachmentAmnesty: z.boolean().optional(),
});

export interface ParsedAction {
  ok: boolean;
  summary: string;
  actionType: ActionType;
  warTarget: string | null;
  effects: Partial<Record<StatKey, number>>;
  mood: Partial<Record<MoodKey, number>>;
  treasuryDelta: number;
  treasuryNote: string | null;
  absurdity: number;
  ideologyTags: IdeologyTag[];
  impeachmentAmnesty: boolean;
}

function neutralAction(): ParsedAction {
  return {
    ok: false,
    summary: '', // UI-слой показывает своё локализованное сообщение при !ok
    actionType: 'other',
    warTarget: null,
    effects: {},
    mood: {},
    treasuryDelta: 0,
    treasuryNote: null,
    absurdity: 0,
    ideologyTags: [],
    impeachmentAmnesty: false,
  };
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clampCap = (v: number, cap: number) => clamp(v, -cap, cap);

// Потолки зависят от режима (7.4); потолки динамических событий жёстче (7.4.1).
export function validateAction(raw: unknown, mode: GameMode): ParsedAction {
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) return neutralAction();
  const d = parsed.data;
  const caps = CONFIG.caps[mode];

  const effects: Partial<Record<StatKey, number>> = {};
  if (d.effects) {
    for (const [k, v] of Object.entries(d.effects)) {
      if (!statKeySet.has(k) || !finite(v)) continue; // производные ключи отбрасываются
      effects[k as StatKey] = clampCap(v, caps.stat);
    }
  }
  const mood: Partial<Record<MoodKey, number>> = {};
  if (d.mood) {
    for (const [k, v] of Object.entries(d.mood)) {
      if (!moodKeySet.has(k) || !finite(v)) continue;
      let val = v;
      // креативизм прощает негатив (7.3.1)
      if (mode === 'creative' && val < 0) val = val * CONFIG.caps.creative.negativeMoodMult;
      mood[k as MoodKey] = clampCap(val, caps.mood);
    }
  }
  const ideologyTags = (d.ideologyTags ?? [])
    .filter((t): t is IdeologyTag => ideologySet.has(t))
    .slice(0, 3);

  return {
    ok: true,
    // пустой summary → UI-слой показывает локализованный дефолт
    summary: d.summary && d.summary.trim() ? d.summary.trim() : '',
    actionType: d.actionType ?? 'other',
    warTarget: d.warTarget ?? null,
    effects,
    mood,
    treasuryDelta: finite(d.treasuryDelta) ? clampCap(d.treasuryDelta, caps.treasury) : 0,
    // пояснение траты/прихода казны — короткая фраза (проблема 5)
    treasuryNote: typeof d.treasuryNote === 'string' && d.treasuryNote.trim()
      ? d.treasuryNote.trim().slice(0, 80)
      : null,
    absurdity: finite(d.absurdity)
      ? clamp(d.absurdity, CONFIG.absurdity.min, CONFIG.absurdity.max)
      : 0,
    ideologyTags,
    impeachmentAmnesty: d.impeachmentAmnesty === true,
  };
}

const dynamicEventSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  effects: looseRecord.optional(),
  mood: looseRecord.optional(),
  treasuryDelta: z.number().optional(),
  newArc: z.string().nullable().optional(),
  parentArcId: z.string().nullable().optional(),
  resolvesArc: z.boolean().optional(),
  charactersReferenced: z.array(z.string()).optional(),
  newCharacter: z
    .object({ name: z.string(), role: z.string().optional() })
    .nullable()
    .optional(),
});

export interface ValidatedDynamicEvent {
  title: string;
  description: string;
  effects: Partial<Record<StatKey, number>>;
  mood: Partial<Record<MoodKey, number>>;
  treasuryDelta: number;
  newArc: string | null;
  parentArcId: string | null;
  resolvesArc: boolean;
  charactersReferenced: string[];
  newCharacter: { name: string; role: string } | null;
}

// Динамические события не трогают absurdityTotal и не завершают игру — это
// обеспечено конструктором: таких полей в схеме просто нет.
export function validateDynamicEvent(raw: unknown): ValidatedDynamicEvent | null {
  const parsed = dynamicEventSchema.safeParse(raw);
  if (!parsed.success) return null;
  const d = parsed.data;
  if (!d.title.trim()) return null;
  const caps = CONFIG.dynamicEventCaps;

  const effects: Partial<Record<StatKey, number>> = {};
  if (d.effects) {
    for (const [k, v] of Object.entries(d.effects)) {
      if (!statKeySet.has(k) || !finite(v)) continue;
      effects[k as StatKey] = clampCap(v, caps.stat);
    }
  }
  const mood: Partial<Record<MoodKey, number>> = {};
  if (d.mood) {
    for (const [k, v] of Object.entries(d.mood)) {
      if (!moodKeySet.has(k) || !finite(v)) continue;
      mood[k as MoodKey] = clampCap(v, caps.mood);
    }
  }

  return {
    title: d.title.trim(),
    description: d.description?.trim() ?? '',
    effects,
    mood,
    treasuryDelta: finite(d.treasuryDelta) ? clampCap(d.treasuryDelta, caps.treasury) : 0,
    newArc: d.newArc?.trim() || null,
    parentArcId: d.parentArcId?.trim() || null,
    resolvesArc: d.resolvesArc ?? false,
    charactersReferenced: (d.charactersReferenced ?? []).filter((n) => typeof n === 'string'),
    newCharacter: d.newCharacter?.name?.trim()
      ? { name: d.newCharacter.name.trim(), role: d.newCharacter.role?.trim() ?? '' }
      : null,
  };
}

// Единый ответ narrate: сводка + flavor базового ивента + динамическое событие.
export interface NarrateResult {
  news: string | null;
  baseEventFlavor: { title: string; description: string } | null;
  dynamicEvent: ValidatedDynamicEvent | null;
}

export function validateNarrate(raw: unknown): NarrateResult {
  const empty: NarrateResult = { news: null, baseEventFlavor: null, dynamicEvent: null };
  const schema = z.object({
    news: z.string().nullable().optional(),
    baseEventFlavor: z
      .object({ title: z.string(), description: z.string() })
      .nullable()
      .optional(),
    dynamicEvent: dynamicEventSchema.nullable().optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return empty;
  const d = parsed.data;
  return {
    news: d.news?.trim() ? d.news.trim() : null,
    baseEventFlavor:
      d.baseEventFlavor && d.baseEventFlavor.title.trim()
        ? { title: d.baseEventFlavor.title.trim(), description: d.baseEventFlavor.description.trim() }
        : null,
    dynamicEvent: d.dynamicEvent ? validateDynamicEvent(d.dynamicEvent) : null,
  };
}
