// LLM prompts (spec section 8). System instructions and user-message labels
// are built in the run language; JSON schema keys are NEVER translated and
// stay English for every language (hard invariant).
// Static part goes first, variables last in the user message.
// The world setting is always the first line of the user message: it affects
// texts only and can never change numbers, triggers or game rules.

import { CONFIG } from '../engine/config.js';
import { avgMood, bandOf, type GameState } from '../engine/state.js';
import {
  arcTitle, baseEventTitle, neighborName, renderArcOutcome, renderChronicleEntry,
  PROMPT_STRINGS, UI_STRINGS, type UiLanguage,
} from '../i18n.js';

export interface NarrateContext {
  actionSummary: string | null;
  turnNotes: string[];
  baseEvent: { id: string } | null; // id базового ивента; название — в i18n
  cooldownActive: boolean;
}

// Compact state serialization (numbers only). The Russian wrapper keys are
// technical labels for the model; schema keys do not depend on them.
// Neighbor names and mood bands are rendered in the run language.
function compactState(state: GameState, lang: UiLanguage): string {
  const bands = UI_STRINGS[lang].status.bandLabels;
  return JSON.stringify({
    неделя: state.week,
    статы: state.stats,
    настроения: Object.fromEntries(
      Object.entries(state.mood).map(([k, v]) => [k, { значение: v, пояс: bands[bandOf(v)] }]),
    ),
    казна: Math.round(state.treasury * 100) / 100,
    соседи: state.neighbors.map((n) => ({
      имя: neighborName(lang, n.id),
      сила: n.strength,
      отношения: n.relations,
    })),
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
const PARSE_SCHEMA = '{"summary": string (одно предложение), "actionType": "law"|"decree"|"statement"|"war"|"other", "warTarget": string|null (имя соседа, только для war), "effects": {economy,poverty,unemployment,inflation,freedom,corruption,stability,powerConcentration,education,technology,warMood: number}, "mood": {elites,military,workers,youth: number}, "treasuryDelta": number, "treasuryNote": string|null (≤80 символов, за что именно изменилась казна), "absurdity": 0..100, "ideologyTags": [0–3 тегов], "impeachmentAmnesty": boolean (true только для явного и дорогого жеста примирения замороженного слоя)}';
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
    p.treasuryRule,
    p.treasuryNoteRule,
    p.amnestyRule,
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
    compactState(state, lang),
    `${p.neighborsLabel}: ` + state.neighbors
      .map((n) => `${neighborName(lang, n.id)} ${p.neighborShort(n.strength, n.relations)}`)
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
    p.consistencyRule,
    p.strictJsonLabel,
    NARRATE_SCHEMA,
    p.narrateDynRules,
    p.arcContinueRule,
    p.arcResolveRule,
    p.treasuryRule,
    p.writeIn,
    p.keysEnglish,
    p.settingRule,
  ].join('\n');
  const user = [
    settingUserLine(state, lang),
    p.stateLabel,
    compactState(state, lang),
    `${p.chronicleLabel} ${p.chronicleTail(CONFIG.run.chronicleLimit)}`,
    state.chronicle.map((e) => renderChronicleEntry(lang, e)).join('\n') || p.empty,
    p.countersLine(
      state.counters.actions,
      state.counters.baseEvents,
      state.counters.dynamicEvents,
      state.counters.arcsFinished,
      state.chronicleCollapsed,
    ),
    `${p.activeArcsLabel}:\n` + (state.arcs.map((a) =>
      p.arcEntry(a.id, arcTitle(lang, a), a.stage, a.description)).join('\n') || p.none),
    `${p.finishedArcsLabel}: ` + (state.finishedArcs.map((a) => {
      const title = a.title || arcTitle(lang, { id: a.id, title: '', warTarget: null });
      return `${title} — ${renderArcOutcome(lang, a.outcome)}`;
    }).join('; ') || p.none),
    `${p.charactersLabel}: ` + (state.characters
      .map((c) => `${c.name}, ${c.role || p.unknownRole}, ${p.attitudeLabel} ${c.attitude}`)
      .join('; ') || p.none),
    `${p.ideologyLabel}: ` + ideologyLine(state, lang),
    ctx.baseEvent ? p.baseEventGiven(baseEventTitle(lang, ctx.baseEvent.id)) : p.baseEventNone,
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
    compactState(state, lang),
    `${p.chronicleLabel}:`,
    state.chronicle.map((e) => renderChronicleEntry(lang, e)).join('\n') || p.empty,
    `${p.charactersLabel}: ` + (state.characters.map((c) => `${c.name}, ${c.role || p.unknownRole}`).join('; ') || p.none),
    p.populationLine(
      String(state.populationStart),
      String(Math.round(state.population * 1000) / 1000),
      String(Math.round(popChange * 100) / 100),
      Math.abs(popChange) > 1,
    ),
  ].join('\n');
  return { system, user };
}
