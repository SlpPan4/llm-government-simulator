// «Симулятор государства» — консольный цикл игры (раздел 9 спецификации).
// Запуск: npm run dev. Движок в engine/, LLM-слой в llm/, локализация в i18n.ts.

import 'dotenv/config';
import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';

import { CONFIG, MOOD_KEYS, STAT_KEYS, clamp, type GameMode } from './engine/config.js';
import {
  avgMood, bandOf, canHaveDynamicEvent, createInitialState,
  applyDynamicEvent, ideologyProfile, type GameState,
} from './engine/state.js';
import { tickWeeks } from './engine/tick.js';
import { advanceArcs, executeAction } from './engine/triggers.js';
import { validateAction, validateNarrate } from './engine/validator.js';
import {
  avgAbsurdity, computeScore, endingFromGameOver, makeEnding, resolveTermEnding,
  stayAttemptAutoFails, stayAttemptSuccess,
} from './engine/score.js';
import {
  LANGUAGE_MENU, LANGUAGE_NAMES, UI_LANGUAGES, UI_STRINGS,
  type UiLanguage, type UiStrings,
} from './i18n.js';
import { createLLM, type LLM } from './llm/client.js';

const MONTHS_TOTAL = CONFIG.run.termWeeks / 4;

// Баннер печатается до выбора языка, поэтому — на языке по умолчанию (ru).
function printBanner(t: UiStrings): void {
  const W = 34;
  console.log(`╔${'═'.repeat(W)}╗`);
  console.log(`║   ${t.bannerTitle.padEnd(30)}║`);
  console.log(`║   ${t.bannerSubtitle.padEnd(30)}║`);
  console.log(`╚${'═'.repeat(W)}╝`);
}

function printStatus(state: GameState, lang: UiLanguage): void {
  const t = UI_STRINGS[lang];
  const week = Math.min(state.week, CONFIG.run.termWeeks);
  const month = Math.min(MONTHS_TOTAL, Math.floor((state.week - 1) / 4) + 1);
  console.log(`\n═══ ${state.countryName.toUpperCase()} ═══`);
  console.log(
    t.status.weekLine(
      week, CONFIG.run.termWeeks, month, MONTHS_TOTAL,
      t.status.modeLabels[state.mode], state.treasury.toFixed(1),
    ),
  );
  console.log(t.status.langLine(LANGUAGE_NAMES[lang]));
  for (const k of STAT_KEYS) {
    console.log(`  ${t.status.statLabels[k]}: ${state.stats[k].toFixed(0)}`);
  }
  for (const k of MOOD_KEYS) {
    const v = state.mood[k];
    console.log(`  ${t.status.moodLabels[k]}: ${v.toFixed(0)} (${t.status.bandLabels[bandOf(v)]})`);
  }
  const ideology = ideologyProfile(state).join(', ') || t.status.noIdeology;
  console.log(t.status.absurdLine(avgAbsurdity(state).toFixed(1), ideology, avgMood(state).toFixed(0)));
  const arrow = (cur: number, prev: number) => (cur > prev ? '↑' : cur < prev ? '↓' : '·');
  console.log(
    t.status.homelessLine(
      state.homelessness.toFixed(1), arrow(state.homelessness, state.prevHomelessness),
      state.population.toFixed(2), arrow(state.population, state.prevPopulation),
    ),
  );
  for (const n of state.neighbors) {
    console.log(t.status.neighborLine(n.name, n.strength, n.relations.toFixed(0)));
  }
  if (state.arcs.length > 0) {
    console.log(t.status.arcsHeader);
    for (const a of state.arcs) {
      console.log(t.status.arcLine(a.title, a.stage + 1) + (a.kind === 'custom' ? ` ${t.status.customMark}` : ''));
    }
  }
}

function printAbsurdityBar(v: number, lang: UiLanguage): void {
  const t = UI_STRINGS[lang];
  const filled = Math.round(v / 10);
  console.log(`${t.status.absurdBarLabel}: [${'█'.repeat(filled)}${'░'.repeat(10 - filled)}] ${v}/100`);
}

// Один ход: действие или пропуск → тик → арки → новости.
async function playTurn(
  state: GameState,
  llm: LLM,
  actionText: string | null,
  weeks: number,
  lang: UiLanguage,
): Promise<void> {
  const t = UI_STRINGS[lang];
  const startWeek = state.week;
  const turnNotes: string[] = [];
  const skipIds = new Set<string>();
  let actionSummary: string | null = null;

  if (actionText !== null) {
    let rawParsed: unknown = null;
    try {
      rawParsed = await llm.parseAction(state, actionText);
    } catch {
      rawParsed = null;
    }
    const parsed = validateAction(rawParsed, state.mode);
    if (!parsed.ok) {
      console.log(`\n${t.turn.actionFailed}`);
    } else {
      const outcome = executeAction(state, parsed);
      console.log(`\n▶ ${parsed.summary}`);
      if (outcome.kind === 'war') {
        if (outcome.arc) {
          console.log(t.turn.warDeclared(outcome.arc.title));
          turnNotes.push(`объявлена война: ${outcome.arc.title}`);
          skipIds.add(outcome.arc.id);
        } else {
          console.log(t.turn.warNoTarget);
        }
      } else if (parsed.absurdity > CONFIG.absurdity.printThreshold) {
        printAbsurdityBar(parsed.absurdity, lang);
      }
      actionSummary = parsed.summary;
    }
  }

  const tickResult = tickWeeks(state, weeks);
  if (tickResult.startedArc) {
    console.log(`\n${t.turn.crisisStarted(tickResult.startedArc.title, state.week)}`);
    turnNotes.push(`началась кризисная арка: ${tickResult.startedArc.title}`);
    skipIds.add(tickResult.startedArc.id);
  }

  const happenings = advanceArcs(state, skipIds);
  for (const h of happenings) {
    console.log(`\n${h.kind === 'gameOver' ? '💥' : ''} ${h.text}`);
    turnNotes.push(h.text);
  }

  if (state.gameOver) return;

  // Экономия на новостях: тихий тик без действий/арок/ивентов и |Δ| < 3.
  const somethingHappened =
    actionSummary !== null || happenings.length > 0 || tickResult.baseEvent !== null;
  if (!somethingHappened && tickResult.calm) {
    console.log(`\n${t.turn.calmWeeks(startWeek, state.week - 1)}`);
    return;
  }

  const cooldownActive = !canHaveDynamicEvent(state);
  let narrateRaw: unknown = null;
  try {
    narrateRaw = await llm.narrate(state, {
      actionSummary,
      turnNotes,
      baseEvent: tickResult.baseEvent,
      cooldownActive,
    });
  } catch {
    narrateRaw = null;
  }
  const news = validateNarrate(narrateRaw);

  if (tickResult.baseEvent) {
    const flavor = news.baseEventFlavor;
    console.log(`\n${t.turn.baseEventTitle(flavor?.title ?? tickResult.baseEvent.title)}`);
    if (flavor?.description) console.log(flavor.description);
  }
  if (news.dynamicEvent) {
    const evt = news.dynamicEvent;
    applyDynamicEvent(state, evt);
    console.log(`\n${t.turn.dynamicEventTitle(evt.title, evt.description)}`);
    if (evt.newArc) console.log(t.turn.newArc(evt.title, evt.newArc));
    if (evt.parentArcId && evt.resolvesArc) console.log(t.turn.arcResolved(evt.parentArcId, evt.title));
  }
  if (news.news) {
    console.log(`\n${t.turn.newspaperHeader}\n${news.news}`);
  } else if (!tickResult.baseEvent && !news.dynamicEvent) {
    console.log(`\n${t.turn.noHappenings(startWeek, state.week - 1)}`);
  }
}

async function finale(state: GameState, llm: LLM, endingLabel: string | null, lang: UiLanguage): Promise<void> {
  const t = UI_STRINGS[lang];
  const ending = state.gameOver
    ? endingFromGameOver(state)
    : endingLabel === 'surrender'
      ? makeEnding('overthrown', t.finale.surrenderDescription)
      : resolveTermEnding(state);

  console.log(t.finale.header);
  console.log(t.finale.endingLabel(t.finale.endingLabels[ending.id]));
  console.log(ending.description);

  const score = computeScore(state, ending);

  let epilogueText: string;
  try {
    epilogueText = await llm.epilogue(state, t.finale.endingLabels[ending.id], score.total);
  } catch {
    epilogueText = t.finale.epilogueFallback;
  }
  console.log(`${t.finale.epilogueHeader}\n${epilogueText}`);

  console.log(t.finale.scoreHeader);
  console.log(t.finale.scoreBase(score.base.toFixed(1), CONFIG.score.baseDiv, (score.base / CONFIG.score.baseDiv).toFixed(2)));
  console.log(t.finale.scoreEnding(t.finale.endingLabels[ending.id], score.endingMult));
  console.log(t.finale.scoreAbsurd(avgAbsurdity(state).toFixed(1), score.absurdityMod.toFixed(3)));
  console.log(t.finale.total(score.total));
}

async function main(): Promise<void> {
  // Постоянный слушатель строк: readline/promises теряет строки из pipe,
  // пришедшие одним чанком, поэтому ввод — через собственную очередь.
  const rl = createInterface({ input, output });
  const lineQueue: string[] = [];
  const waiters: Array<(line: string | null) => void> = [];
  let inputClosed = false;
  rl.on('line', (line) => {
    const w = waiters.shift();
    if (w) w(line);
    else lineQueue.push(line);
  });
  rl.on('close', () => {
    inputClosed = true;
    for (const w of waiters.splice(0)) w(lineQueue.length > 0 ? lineQueue.shift()! : null);
  });
  const ask = (q: string): Promise<string | null> => {
    rl.setPrompt(q);
    rl.prompt();
    if (lineQueue.length > 0) return Promise.resolve(lineQueue.shift()!);
    if (inputClosed) return Promise.resolve(null);
    return new Promise((resolve) => waiters.push(resolve));
  };

  // Баннер и ввод названия — на языке по умолчанию; меню языка трёхъязычное.
  const tDefault = UI_STRINGS.ru;
  printBanner(tDefault);

  const nameRaw = await ask(tDefault.countryNamePrompt);
  if (nameRaw === null) { rl.close(); return; }
  const countryName = nameRaw.trim() || tDefault.defaultCountryName;

  console.log(LANGUAGE_MENU.title);
  for (const line of LANGUAGE_MENU.options) console.log(line);
  let lang: UiLanguage = 'ru';
  for (;;) {
    const c = (await ask(LANGUAGE_MENU.prompt))?.trim();
    if (c === null) { rl.close(); return; }
    const idx = Number(c) - 1;
    if (c !== '' && idx >= 0 && idx < UI_LANGUAGES.length) { lang = UI_LANGUAGES[idx]; break; }
    console.log(LANGUAGE_MENU.invalid);
  }
  const t = UI_STRINGS[lang];
  const llm = createLLM(lang);

  const settingRaw = await ask(t.settingPrompt);
  if (settingRaw === null) { rl.close(); return; }
  const setting = settingRaw.trim() || t.defaultSetting;

  console.log(t.modeTitle);
  console.log(t.modeRealism);
  console.log(t.modeCreative);

  let mode: GameMode = 'realism';
  for (;;) {
    const c = (await ask(t.modePrompt))?.trim();
    if (c === null) { rl.close(); return; }
    if (c === '1') { mode = 'realism'; break; }
    if (c === '2') { mode = 'creative'; break; }
    console.log(t.invalidMode);
  }

  const state = createInitialState(mode, countryName, setting);
  console.log(t.intro(countryName, CONFIG.run.termWeeks));
  console.log(t.commandsHint);

  for (;;) {
    printStatus(state, lang);
    if (state.gameOver) break;
    if (state.week > CONFIG.run.termWeeks) break;

    const raw = await ask('\n> ');
    if (raw === null) {
      console.log(t.inputClosed);
      rl.close();
      return;
    }
    const cmd = raw.trim();
    if (!cmd) continue;

    const cmdLower = cmd.toLowerCase();
    if (t.commands.status.includes(cmdLower)) continue; // панель только что напечатана
    if (t.commands.setting.includes(cmdLower)) {
      console.log(t.status.settingReply(state.setting));
      continue;
    }
    if (t.commands.surrender.includes(cmdLower)) {
      await finale(state, llm, 'surrender', lang);
      rl.close();
      return;
    }
    const skipMatch = t.commands.skipPattern.exec(cmd);
    if (skipMatch) {
      const n = clamp(parseInt(skipMatch[1], 10), CONFIG.run.skipMinWeeks, CONFIG.run.skipMaxWeeks);
      await playTurn(state, llm, null, n, lang);
    } else {
      await playTurn(state, llm, cmd, CONFIG.run.weeksAfterAction, lang);
    }
  }

  // Финал: game over или конец срока.
  if (state.gameOver) {
    await finale(state, llm, null, lang);
    rl.close();
    return;
  }

  // Конец срока: возможно, попытка остаться у власти (7.9).
  let ending = resolveTermEnding(state);
  if (state.stats.powerConcentration >= CONFIG.endings.stayPowerThreshold) {
    const ans = await ask(t.finale.stayPrompt);
    if (ans && t.commands.yesWords.includes(ans.trim().toLowerCase())) {
      if (stayAttemptAutoFails(state)) {
        ending = makeEnding('overthrown', t.finale.stayFailedUnrest);
      } else if (stayAttemptSuccess(state)) {
        ending = makeEnding('for_life', t.finale.staySuccess);
      } else {
        ending = makeEnding('overthrown', t.finale.stayFailedElites);
      }
    }
  }
  await finale(state, llm, null, lang);
  rl.close();
}

main().catch((err) => {
  console.error('Игра завершилась с ошибкой:', err);
  process.exitCode = 1;
});
