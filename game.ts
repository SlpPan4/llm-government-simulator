// «Симулятор государства» — консольный цикл игры (раздел 9 спецификации).
// Запуск: npm run dev. Движок в engine/, LLM-слой в llm/, локализация в i18n.ts,
// сохранения и транскрипт — в save.ts (7.10).

import 'dotenv/config';
import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { existsSync } from 'node:fs';

import { CONFIG, MOOD_KEYS, STAT_KEYS, clamp, type GameMode } from './engine/config.js';
import {
  avgMood, bandOf, canHaveDynamicEvent, createInitialState,
  applyDynamicEvent, ideologyProfile, normalizeArcId, type GameState,
} from './engine/state.js';
import { tickWeeks } from './engine/tick.js';
import { advanceArcs, executeAction } from './engine/triggers.js';
import { validateAction, validateNarrate, type ParsedAction } from './engine/validator.js';
import {
  avgAbsurdity, computeScore, endingFromGameOver, makeEnding, resolveTermEnding,
  stayAttemptAutoFails, stayAttemptSuccess,
} from './engine/score.js';
import {
  LANGUAGE_MENU, LANGUAGE_NAMES, NEIGHBOR_NAMES, UI_LANGUAGES, UI_STRINGS,
  arcTitle, baseEventTitle, neighborName, renderEndingDescription, renderHappening,
  type UiLanguage, type UiStrings,
} from './i18n.js';
import { createLLM, type LLM } from './llm/client.js';
import {
  autosavePath, loadGame, resetTranscript, saveGame, savePathFor, tee, teeInput,
  VersionMismatchError, SAVE_VERSION,
} from './save.js';

const MONTHS_TOTAL = CONFIG.run.termWeeks / 4;

// Баннер печатается до выбора языка, поэтому — на языке по умолчанию (ru).
function printBanner(t: UiStrings): void {
  const W = 34;
  tee(`╔${'═'.repeat(W)}╗`);
  tee(`║   ${t.bannerTitle.padEnd(30)}║`);
  tee(`║   ${t.bannerSubtitle.padEnd(30)}║`);
  tee(`╚${'═'.repeat(W)}╝`);
}

function printStatus(state: GameState, lang: UiLanguage): void {
  const t = UI_STRINGS[lang];
  const week = Math.min(state.week, CONFIG.run.termWeeks);
  const month = Math.min(MONTHS_TOTAL, Math.floor((state.week - 1) / 4) + 1);
  tee(`\n═══ ${state.countryName.toUpperCase()} ═══`);
  tee(
    t.status.weekLine(
      week, CONFIG.run.termWeeks, month, MONTHS_TOTAL,
      t.status.modeLabels[state.mode], state.treasury.toFixed(1),
    ),
  );
  tee(t.status.langLine(LANGUAGE_NAMES[lang]));
  for (const k of STAT_KEYS) {
    tee(`  ${t.status.statLabels[k]}: ${state.stats[k].toFixed(0)}`);
  }
  for (const k of MOOD_KEYS) {
    const v = state.mood[k];
    tee(`  ${t.status.moodLabels[k]}: ${v.toFixed(0)} (${t.status.bandLabels[bandOf(v)]})`);
  }
  const ideology = ideologyProfile(state).join(', ') || t.status.noIdeology;
  tee(t.status.absurdLine(avgAbsurdity(state).toFixed(1), ideology, avgMood(state).toFixed(0)));
  const arrow = (cur: number, prev: number) => (cur > prev ? '↑' : cur < prev ? '↓' : '·');
  tee(
    t.status.homelessLine(
      state.homelessness.toFixed(1), arrow(state.homelessness, state.prevHomelessness),
      state.population.toFixed(2), arrow(state.population, state.prevPopulation),
    ),
  );
  for (const n of state.neighbors) {
    tee(t.status.neighborLine(neighborName(lang, n.id), n.strength, n.relations.toFixed(0)));
  }
  if (state.arcs.length > 0) {
    tee(t.status.arcsHeader);
    for (const a of state.arcs) {
      tee(t.status.arcLine(arcTitle(lang, a), a.stage + 1) + (a.kind === 'custom' ? ` ${t.status.customMark}` : ''));
    }
  }
}

function printAbsurdityBar(v: number, lang: UiLanguage): void {
  const t = UI_STRINGS[lang];
  const filled = Math.round(v / 10);
  tee(`${t.status.absurdBarLabel}: [${'█'.repeat(filled)}${'░'.repeat(10 - filled)}] ${v}/100`);
}

// Строка последствий действия (проблема 5): казна — всегда (с пояснением LLM,
// если есть), дельты статов и настроений — при |Δ| ≥ 1. Пусто → не печатаем.
function consequencesLine(parsed: ParsedAction, t: UiStrings): string | null {  const treasury = parsed.treasuryDelta !== 0
    ? `${parsed.treasuryDelta.toFixed(1)}${parsed.treasuryNote ? ` — ${parsed.treasuryNote}` : ''}`
    : null;
  const rest: string[] = [];
  const push = (labels: Record<string, string>, rec: Partial<Record<string, number>>) => {
    for (const [k, v] of Object.entries(rec)) {
      if (typeof v !== 'number' || Math.abs(v) < 1) continue;
      rest.push(`${labels[k]} ${v > 0 ? '+' : ''}${Math.round(v)}`);
    }
  };
  push(t.status.statLabels, parsed.effects);
  push(t.status.moodLabels, parsed.mood);
  if (!treasury && rest.length === 0) return null;
  return t.turn.consequencesLine(treasury, rest.join(', '));
}

// Свободный текст цели войны (игрок или LLM на языке рана) → id соседа.
// Совпадение проверяется по id и по именам всех языков: LLM может вернуть
// имя в любой раскладке, игрок печатает на своём языке.
function resolveNeighborId(state: GameState, raw: string | null): string | null {
  const q = (raw ?? '').trim().toLowerCase();
  if (!q) return null;
  const byId = state.neighbors.find((n) => n.id.toLowerCase() === q);
  if (byId) return byId.id;
  for (const n of state.neighbors) {
    const names = NEIGHBOR_NAMES[n.id] ? Object.values(NEIGHBOR_NAMES[n.id]) : [n.id];
    for (const name of names) {
      const nl = name.toLowerCase();
      if (nl === q || (q.length > 2 && nl.includes(q))) return n.id;
      if (q.length > 2 && nl.split(/\s+/).some((w) => w.length > 3 && q.includes(w))) return n.id;
    }
  }
  return null;
}

// Один ход: действие или пропуск → тик → арки → новости.
async function playTurn(  state: GameState,
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
      tee(`\n${t.turn.actionFailed}`);
    } else {
      if (parsed.actionType === 'war') {
        parsed.warTarget = resolveNeighborId(state, parsed.warTarget);
      }
      const outcome = executeAction(state, parsed);
      tee(`\n▶ ${parsed.summary || t.turn.actionDone}`);
      if (outcome.kind === 'war') {
        if (outcome.arc) {
          const title = arcTitle(lang, outcome.arc);
          tee(t.turn.warDeclared(title));
          turnNotes.push(t.turn.noteWarDeclared(title));
          skipIds.add(outcome.arc.id);
        } else {
          tee(t.turn.warNoTarget);
        }
      } else {
        if (outcome.amnestyApplied) {
          tee(t.turn.amnestyApplied(
            CONFIG.impeachmentAmnesty.floor,
            CONFIG.impeachmentAmnesty.treasuryCost,
            CONFIG.impeachmentAmnesty.stabilityCost,
          ));
        }
        const line = consequencesLine(parsed, t);
        if (line) tee(line);
        if (parsed.absurdity > CONFIG.absurdity.printThreshold) {
          printAbsurdityBar(parsed.absurdity, lang);
        }
      }
      actionSummary = parsed.summary;
    }
  }

  const tickResult = tickWeeks(state, weeks);
  if (tickResult.startedArc) {
    const title = arcTitle(lang, tickResult.startedArc);
    tee(`\n${t.turn.crisisStarted(title, state.week)}`);
    turnNotes.push(t.turn.noteCrisisStarted(title));
    skipIds.add(tickResult.startedArc.id);
  }

  const happenings = advanceArcs(state, skipIds);
  for (const h of happenings) {
    const text = renderHappening(lang, h.msg);
    tee(`\n${h.kind === 'gameOver' ? '💥' : ''} ${text}`);
    turnNotes.push(text);
  }

  if (state.gameOver) return;

  // Экономия на новостях: тихий тик без действий/арок/ивентов и |Δ| < 3.
  const somethingHappened =
    actionSummary !== null || happenings.length > 0 || tickResult.baseEvent !== null;
  if (!somethingHappened && tickResult.calm) {
    tee(`\n${t.turn.calmWeeks(startWeek, state.week - 1)}`);
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
    tee(`\n${t.turn.baseEventTitle(flavor?.title ?? baseEventTitle(lang, tickResult.baseEvent.id))}`);
    if (flavor?.description) tee(flavor.description);
  }
  if (news.dynamicEvent) {
    const evt = news.dynamicEvent;
    applyDynamicEvent(state, evt);
    tee(`\n${t.turn.dynamicEventTitle(evt.title, evt.description)}`);
    if (evt.newArc) tee(t.turn.newArc(evt.title, evt.newArc));
    if (evt.parentArcId && evt.resolvesArc) tee(t.turn.arcResolved(evt.parentArcId, evt.title));
  }
  if (news.news) {
    tee(`\n${t.turn.newspaperHeader}\n${news.news}`);
  } else if (!tickResult.baseEvent && !news.dynamicEvent) {
    tee(`\n${t.turn.noHappenings(startWeek, state.week - 1)}`);
  }
}

async function finale(state: GameState, llm: LLM, endingLabel: string | null, lang: UiLanguage): Promise<void> {
  const t = UI_STRINGS[lang];
  const ending = state.gameOver
    ? endingFromGameOver(state)
    : endingLabel === 'surrender'
      ? makeEnding('overthrown', { k: 'text', text: t.finale.surrenderDescription })
      : resolveTermEnding(state);

  tee(t.finale.header);
  tee(t.finale.endingLabel(t.finale.endingLabels[ending.id]));
  tee(renderEndingDescription(lang, ending.description));

  const score = computeScore(state, ending);

  let epilogueText: string;
  try {
    epilogueText = await llm.epilogue(state, t.finale.endingLabels[ending.id], score.total);
  } catch {
    epilogueText = t.finale.epilogueFallback;
  }
  tee(`${t.finale.epilogueHeader}\n${epilogueText}`);

  tee(t.finale.scoreHeader);
  tee(t.finale.scoreBase(score.base.toFixed(1), CONFIG.score.baseDiv, (score.base / CONFIG.score.baseDiv).toFixed(2)));
  tee(t.finale.scoreEnding(t.finale.endingLabels[ending.id], score.endingMult));
  tee(t.finale.scoreAbsurd(avgAbsurdity(state).toFixed(1), score.absurdityMod.toFixed(3)));
  tee(t.finale.total(score.total));
}

// Сохранение с человекочитаемым сообщением об ошибке (7.10).
function safeSave(state: GameState, filePath: string, lang: UiLanguage): void {
  const t = UI_STRINGS[lang];
  try {
    tee(t.saveDone(saveGame(state, filePath)));
  } catch (err) {
    tee(t.saveFailed(err instanceof Error ? err.message : String(err)));
  }
}

// Автосейв без вывода в консоль; ошибка диска не роняет игру (7.10).
function autoSaveQuiet(state: GameState): void {
  try {
    saveGame(state, autosavePath(state.countryName));
  } catch {
    // ошибка диска не должна прерывать игру
  }
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
  // Промпт печатаем через tee, а полученную строку — в транскрипт (7.10).
  const ask = async (q: string): Promise<string | null> => {
    tee(q);
    let line: string | null;
    if (lineQueue.length > 0) line = lineQueue.shift()!;
    else if (inputClosed) line = null;
    else line = await new Promise<string | null>((resolve) => waiters.push(resolve));
    if (line !== null) teeInput(line);
    return line;
  };

  // Баннер и ввод названия — на языке по умолчанию; меню языка трёхъязычное.
  const tDefault = UI_STRINGS.ru;
  printBanner(tDefault);

  const nameRaw = await ask(tDefault.countryNamePrompt);
  if (nameRaw === null) { rl.close(); return; }
  const countryName = nameRaw.trim() || tDefault.defaultCountryName;

  // 7.10: при старте предлагаем продолжить ран по автосейву.
  let continuedState: GameState | null = null;
  const autoPath = autosavePath(countryName);
  if (existsSync(autoPath)) {
    try {
      const loaded = loadGame(autoPath) as GameState;
      if (!loaded || typeof loaded !== 'object' || typeof loaded.week !== 'number') {
        throw new Error('повреждённый файл сохранения');
      }
      const finished = Boolean(loaded.gameOver) || loaded.week > CONFIG.run.termWeeks;
      if (finished) {
        resetTranscript(); // ран уже завершён — продолжать нечего, начинаем новый
      } else {
        const ans = await ask(tDefault.autosavePrompt(
          loaded.countryName ?? countryName,
          Math.min(loaded.week, CONFIG.run.termWeeks),
          CONFIG.run.termWeeks,
        ));
        if (ans !== null && tDefault.commands.yesWords.includes(ans.trim().toLowerCase())) {
          continuedState = loaded;
        } else {
          resetTranscript(); // продолжать отказались — транскрипт нового рана с чистого листа
        }
      }
    } catch (err) {
      // loadGame бросает до восстановления транскрипта — буфер уже содержит баннер
      tee(tDefault.loadFailed(err instanceof VersionMismatchError
        ? tDefault.saveVersionMismatch(String(err.found), SAVE_VERSION)
        : err instanceof Error ? err.message : String(err)));
    }
  }

  tee(LANGUAGE_MENU.title);
  for (const line of LANGUAGE_MENU.options) tee(line);
  let lang: UiLanguage = 'ru';
  for (;;) {
    const c = (await ask(LANGUAGE_MENU.prompt))?.trim();
    if (c === undefined || c === null) { rl.close(); return; }
    const idx = Number(c) - 1;
    if (c !== '' && idx >= 0 && idx < UI_LANGUAGES.length) { lang = UI_LANGUAGES[idx]; break; }
    tee(LANGUAGE_MENU.invalid);
  }
  const t = UI_STRINGS[lang];
  const llm = createLLM(lang);

  let state: GameState;
  if (continuedState) {
    // транскрипт уже восстановлен loadGame — дальше дописывается без шва
    state = continuedState;
    tee(t.continueLine(state.countryName, Math.min(state.week, CONFIG.run.termWeeks)));
  } else {
    const settingRaw = await ask(t.settingPrompt);
    if (settingRaw === null) { rl.close(); return; }
    const setting = settingRaw.trim() || t.defaultSetting;

    tee(t.modeTitle);
    tee(t.modeRealism);
    tee(t.modeCreative);

    let mode: GameMode = 'realism';
    for (;;) {
      const c = (await ask(t.modePrompt))?.trim();
      if (c === undefined || c === null) { rl.close(); return; }
      if (c === '1') { mode = 'realism'; break; }
      if (c === '2') { mode = 'creative'; break; }
      tee(t.invalidMode);
    }

    state = createInitialState(mode, countryName, setting);
  }
  tee(t.intro(state.countryName, CONFIG.run.termWeeks));
  tee(t.commandsHint);

  for (;;) {
    printStatus(state, lang);
    if (state.gameOver) break;
    if (state.week > CONFIG.run.termWeeks) break;

    const raw = await ask('\n> ');
    if (raw === null) {
      tee(t.inputClosed);
      rl.close();
      return;
    }
    const cmd = raw.trim();
    if (!cmd) continue;

    const cmdLower = cmd.toLowerCase();
    if (t.commands.status.includes(cmdLower)) continue; // панель только что напечатана
    if (t.commands.setting.includes(cmdLower)) {
      tee(t.status.settingReply(state.setting));
      continue;
    }
    if (t.commands.saveQuit.includes(cmdLower)) {
      safeSave(state, autosavePath(state.countryName), lang);
      rl.close();
      return;
    }
    if (t.commands.save.includes(cmdLower)) {
      const nameRaw = await ask(t.savePrompt(state.countryName));
      if (nameRaw !== null) {
        const slug = normalizeArcId(nameRaw.trim() || `${state.countryName}-save`);
        if (!slug) tee(t.saveNameInvalid);
        else safeSave(state, savePathFor(slug), lang);
      }
      continue;
    }
    if (t.commands.surrender.includes(cmdLower)) {
      await finale(state, llm, 'surrender', lang);
      // ран завершён досрочно — помечаем, чтобы автосейв не предлагал продолжить
      state.gameOver = { ending: 'overthrown', reason: { k: 'text', text: t.finale.surrenderDescription } };
      autoSaveQuiet(state); // финальный сейв: в файл попадает и эпилог
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
    autoSaveQuiet(state); // автосейв после КАЖДОГО хода (7.10)
  }

  // Финал: game over или конец срока.
  if (state.gameOver) {
    await finale(state, llm, null, lang);
    autoSaveQuiet(state); // финальный сейв: в файл попадает и эпилог
    rl.close();
    return;
  }

  // Конец срока: возможно, попытка остаться у власти (7.9).
  let ending = resolveTermEnding(state);
  if (state.stats.powerConcentration >= CONFIG.endings.stayPowerThreshold) {
    const ans = await ask(t.finale.stayPrompt);
    if (ans && t.commands.yesWords.includes(ans.trim().toLowerCase())) {
      if (stayAttemptAutoFails(state)) {
        ending = makeEnding('overthrown', { k: 'text', text: t.finale.stayFailedUnrest });
      } else if (stayAttemptSuccess(state)) {
        ending = makeEnding('for_life', { k: 'text', text: t.finale.staySuccess });
      } else {
        ending = makeEnding('overthrown', { k: 'text', text: t.finale.stayFailedElites });
      }
    }
  }
  await finale(state, llm, null, lang);
  autoSaveQuiet(state); // финальный сейв: в файл попадает и эпилог
  rl.close();
}

main().catch((err) => {
  console.error('Игра завершилась с ошибкой:', err);
  process.exitCode = 1;
});
