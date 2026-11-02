// LLM prompts (spec section 8). System instructions and user-message labels
// are built in the run language; JSON schema keys are NEVER translated and
// stay English for every language (hard invariant).
// Static part goes first, variables last in the user message.
// The world setting is always the first line of the user message: it affects
// texts only and can never change numbers, triggers or game rules.

import { CONFIG } from '../engine/config.js';
import { avgMood, bandLabel, bandOf, type GameState } from '../engine/state.js';
import { PROMPT_STRINGS, UI_STRINGS, type UiLanguage } from '../i18n.js';

export interface NarrateContext {
  actionSummary: string | null;
  turnNotes: string[];
  baseEvent: { id: string; title: string; description?: string } | null;
  cooldownActive: boolean;
}

// Compact state serialization (numbers only). The Russian wrapper keys are
// technical labels for the model; schema keys do not depend on them.
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

function ideologyLine(state: GameState, lang: UiLanguage): string {
  const p = PROMPT_STRINGS[lang];
  const top = Object.entries(state.ideology)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t, n]) => `${t} (${n})`);
  return top.length ? top.join(', ') : p.ideologyNone;
}

// The setting goes into every LLM call as the first user line.
// Empty setting falls back to the localized default (modern world).
function settingUserLine(state: GameState, lang: UiLanguage): string {
  const setting = state.setting.trim() || UI_STRINGS[lang].defaultSetting;
  return `${PROMPT_STRINGS[lang].settingPrefix}: ${setting}`;
}

// Answer schemas — ONE for all languages: keys never get translated.
const PARSE_SCHEMA = '{"summary": string (одно предложение), "actionType": "law"|"decree"|"statement"|"war"|"other", "warTarget": string|null (имя соседа, только для war), "effects": {economy,poverty,unemployment,inflation,freedom,corruption,stability,powerConcentration,education,technology,warMood: number}, "mood": {elites,military,workers,youth: number}, "treasuryDelta": number, "absurdity": 0..100, "ideologyTags": [0–3 тегов]}';
const NARRATE_SCHEMA = '{"news": string, "baseEventFlavor": null | {"title": string, "description": string}, "dynamicEvent": null | {"title": string, "description": string (1–3 предложения), "effects": {<11 статов>: number}, "mood": {elites,military,workers,youth: number}, "treasuryDelta": number, "newArc": string|null (slug новой кастомной арки), "parentArcId": string|null, "resolvesArc": boolean, "charactersReferenced": [имена из реестра], "newCharacter": null | {"name": string, "role": string}}}';
const EPILOGUE_SCHEMA = '{"epilogue": string}.';
const IDEOLOGY_TAGS_LINE = 'Идеологические теги: militarism, pacifism, welfare, austerity, authoritarianism, liberalism, technocracy, traditionalism, nationalism, globalism, ecology, populism.';

// Action parser: free text -> strict JSON of effects.
export function buildParseActionPrompt(
  state: GameState,
  actionText: string,
  lang: UiLanguage,
): { system: string; user: string } {
  const p = PROMPT_STRINGS[lang];
  const system = [
    p.parseRole,
    p.tone[state.mode],
    p.parseRules,
    p.answerSchemaLabel + ':',
    PARSE_SCHEMA,
    IDEOLOGY_TAGS_LINE,
    p.writeIn,
    p.keysEnglish,
    p.settingRule,
  ].join('\n');
  const user = [
    settingUserLine(state, lang),
    p.stateNumbersLabel,
    compactState(state),
    `${p.neighborsLabel}: ` + state.neighbors
      .map((n) => `${n.name} ${p.neighborShort(n.strength, n.relations)}`)
      .join('; '),
    `${p.actionLabel}: «${actionText.trim()}»`,
  ].join('\n');
  return { system, user };
}

// Narrator: one JSON — digest, base-event flavor, dynamic event.
export function buildNarratePrompt(
  state: GameState,
  ctx: NarrateContext,
  lang: UiLanguage,
): { system: string; user: string } {
  const p = PROMPT_STRINGS[lang];
  const system = [
    p.narrateRole,
    p.narrateRules,
    p.tone[state.mode],
    p.newsFormat,
    p.strictJsonLabel,
    NARRATE_SCHEMA,
    p.narrateDynRules,
    p.writeIn,
    p.keysEnglish,
    p.settingRule,
  ].join('\n');
  const user = [
    settingUserLine(state, lang),
    p.stateLabel,
    compactState(state),
    `${p.chronicleLabel} ${p.chronicleTail(CONFIG.run.chronicleLimit)}`,
    state.chronicle.join('\n') || p.empty,
    p.countersLine(
      state.counters.actions,
      state.counters.baseEvents,
      state.counters.dynamicEvents,
      state.counters.arcsFinished,
      state.chronicleCollapsed,
    ),
    `${p.activeArcsLabel}: ` + (state.arcs.map((a) => `${a.title} (${p.arcStage(a.stage)})`).join('; ') || p.none),
    `${p.finishedArcsLabel}: ` + (state.finishedArcs.map((a) => `${a.title} — ${a.outcome}`).join('; ') || p.none),
    `${p.charactersLabel}: ` + (state.characters
      .map((c) => `${c.name}, ${c.role}, ${p.attitudeLabel} ${c.attitude}`)
      .join('; ') || p.none),
    `${p.ideologyLabel}: ` + ideologyLine(state, lang),
    ctx.baseEvent ? p.baseEventGiven(ctx.baseEvent.title) : p.baseEventNone,
    ctx.cooldownActive ? p.cooldownOn : p.cooldownOff,
    ctx.actionSummary ? `${p.actionLabel}: ${ctx.actionSummary}` : p.noAction,
    `${p.turnEventsLabel}: ` + (ctx.turnNotes.join('; ') || p.nothing),
  ].join('\n');
  return { system, user };
}

// Epilogue: "what happens in 10 years".
export function buildEpiloguePrompt(
  state: GameState,
  endingLabel: string,
  scoreTotal: number,
  lang: UiLanguage,
): { system: string; user: string } {
  const p = PROMPT_STRINGS[lang];
  const system = [
    p.epilogueRole,
    p.epilogueTask(state.mode === 'creative'),
    p.epilogueMention,
    p.strictJsonLabel,
    EPILOGUE_SCHEMA,
    p.writeIn,
    p.keysEnglish,
    p.settingRule,
  ].join('\n');
  const popChange = state.populationStart > 0
    ? ((state.population - state.populationStart) / state.populationStart) * 100
    : 0;
  const user = [
    settingUserLine(state, lang),
    p.endingLine(state.countryName, endingLabel, scoreTotal),
    p.finalStateLabel,
    compactState(state),
    `${p.chronicleLabel}:`,
    state.chronicle.join('\n') || p.empty,
    `${p.charactersLabel}: ` + (state.characters.map((c) => `${c.name}, ${c.role}`).join('; ') || p.none),
    p.populationLine(
      String(state.populationStart),
      String(Math.round(state.population * 1000) / 1000),
      String(Math.round(popChange * 100) / 100),
      Math.abs(popChange) > 1,
    ),
  ].join('\n');
  return { system, user };
}
