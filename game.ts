// «Симулятор государства» — консольный цикл игры (раздел 9 спецификации).
// Запуск: npm run dev. Движок в engine/, LLM-слой в llm/.

import 'dotenv/config';
import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';

import { CONFIG, clamp, type GameMode } from './engine/config.js';
import {
  avgMood, bandLabel, bandOf, canHaveDynamicEvent, createInitialState,
  applyDynamicEvent, ideologyProfile, type GameState,
} from './engine/state.js';
import { tickWeeks } from './engine/tick.js';
import { advanceArcs, executeAction } from './engine/triggers.js';
import { validateAction, validateNarrate } from './engine/validator.js';
import {
  avgAbsurdity, computeScore, endingFromGameOver, makeEnding, resolveTermEnding,
  stayAttemptAutoFails, stayAttemptSuccess,
} from './engine/score.js';
import { createLLM, type LLM } from './llm/client.js';

const MONTHS_TOTAL = CONFIG.run.termWeeks / 4;

function printStatus(state: GameState): void {
  const week = Math.min(state.week, CONFIG.run.termWeeks);
  const month = Math.min(MONTHS_TOTAL, Math.floor((state.week - 1) / 4) + 1);
  console.log(`\n═══ ${state.countryName.toUpperCase()} ═══`);
  console.log(
    `Неделя ${week}/${CONFIG.run.termWeeks} (≈${month}/${MONTHS_TOTAL} мес.) | `
    + `Режим: ${state.mode === 'realism' ? 'РЕАЛИЗМ' : 'КРЕАТИВИЗМ'} | `
    + `Казна: ${state.treasury.toFixed(1)} млрд`,
  );
  for (const [k, def] of Object.entries(CONFIG.stats)) {
    console.log(`  ${def.label}: ${state.stats[k as keyof typeof state.stats].toFixed(0)}`);
  }
  for (const [k, def] of Object.entries(CONFIG.moods)) {
    const v = state.mood[k as keyof typeof state.mood];
    console.log(`  ${def.label}: ${v.toFixed(0)} (${bandLabel(bandOf(v))})`);
  }
  const ideology = ideologyProfile(state).join(', ') || '—';
  console.log(
    `Средний абсурд рана: ${avgAbsurdity(state).toFixed(1)} | Идеология: ${ideology} | `
    + `Среднее настроение: ${avgMood(state).toFixed(0)}`,
  );
  const arrow = (cur: number, prev: number) => (cur > prev ? '↑' : cur < prev ? '↓' : '·');
  console.log(
    `Бездомность: ${state.homelessness.toFixed(1)}% ${arrow(state.homelessness, state.prevHomelessness)} | `
    + `Население: ${state.population.toFixed(2)} млн ${arrow(state.population, state.prevPopulation)}`,
  );
  for (const n of state.neighbors) {
    console.log(`  Сосед: ${n.name} (сила ${n.strength}, отношения ${n.relations.toFixed(0)})`);
  }
  if (state.arcs.length > 0) {
    console.log('⚠ Активные кризисы и арки:');
    for (const a of state.arcs) console.log(`  ⚠ ${a.title} (стадия ${a.stage + 1})${a.kind === 'custom' ? ' 📖' : ''}`);
  }
}

function printAbsurdityBar(v: number): void {
  const filled = Math.round(v / 10);
  console.log(`Шкала абсурда: [${'█'.repeat(filled)}${'░'.repeat(10 - filled)}] ${v}/100`);
}

// Один ход: действие или пропуск → тик → арки → новости.
async function playTurn(
  state: GameState,
  llm: LLM,
  actionText: string | null,
  weeks: number,
): Promise<void> {
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
      console.log(`\n${parsed.summary}`);
    } else {
      const outcome = executeAction(state, parsed);
      console.log(`\n▶ ${parsed.summary}`);
      if (outcome.kind === 'war') {
        if (outcome.arc) {
          console.log(`⚠ Объявлена война: ${outcome.arc.title}`);
          turnNotes.push(`объявлена война: ${outcome.arc.title}`);
          skipIds.add(outcome.arc.id);
        } else {
          console.log('⚠ Война не началась: такого соседа нет.');
        }
      } else if (parsed.absurdity > CONFIG.absurdity.printThreshold) {
        printAbsurdityBar(parsed.absurdity);
      }
      actionSummary = parsed.summary;
    }
  }

  const tickResult = tickWeeks(state, weeks);
  if (tickResult.startedArc) {
    console.log(`\n⚠ Кризис: «${tickResult.startedArc.title}»! Время прервано на неделе ${state.week}.`);
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
    console.log(`\nНедели ${startWeek}–${state.week - 1} прошли спокойно.`);
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
    console.log(`\n⚡ Событие: ${flavor?.title ?? tickResult.baseEvent.title}`);
    if (flavor?.description) console.log(flavor.description);
  }
  if (news.dynamicEvent) {
    const evt = news.dynamicEvent;
    applyDynamicEvent(state, evt);
    console.log(`\n⚡ Событие: ${evt.title} — ${evt.description}`);
    if (evt.newArc) console.log(`📖 Сюжет: открыта арка «${evt.title}» (${evt.newArc})`);
    if (evt.parentArcId && evt.resolvesArc) console.log(`📖 Сюжет: арка «${evt.parentArcId}» завершена — ${evt.title}`);
  }
  if (news.news) {
    console.log(`\n─── Газета ───\n${news.news}`);
  } else if (!tickResult.baseEvent && !news.dynamicEvent) {
    console.log(`\nНедели ${startWeek}–${state.week - 1} прошли без происшествий.`);
  }
}

async function finale(state: GameState, llm: LLM, endingLabel: string | null): Promise<void> {
  const ending = state.gameOver
    ? endingFromGameOver(state)
    : endingLabel === 'surrender'
      ? makeEnding('overthrown', 'Президент досрочно подал в отставку.')
      : resolveTermEnding(state);

  console.log('\n═══ КОНЕЦ ПРАВЛЕНИЯ ═══');
  console.log(`Концовка: ${ending.label}`);
  console.log(ending.description);

  const score = computeScore(state, ending);

  let epilogueText: string;
  try {
    epilogueText = await llm.epilogue(state, ending.label, score.total);
  } catch {
    epilogueText = 'История ещё напишет об этом правлении.';
  }
  console.log(`\n─── Эпилог ───\n${epilogueText}`);

  console.log('\n─── Счёт ───');
  console.log(`База: ${score.base.toFixed(1)} / ${CONFIG.score.baseDiv} = ${(score.base / CONFIG.score.baseDiv).toFixed(2)}`);
  console.log(`× концовка (${ending.label}): ${score.endingMult}`);
  console.log(`× абсурд (${avgAbsurdity(state).toFixed(1)} средний): ${score.absurdityMod.toFixed(3)}`);
  console.log(`ИТОГО: ${score.total}`);
}

async function main(): Promise<void> {
  const llm = createLLM();
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

  console.log('╔══════════════════════════════════╗');
  console.log('║   СИМУЛЯТОР ГОСУДАРСТВА          ║');
  console.log('║   4 года. 192 недели. Одна власть.║');
  console.log('╚══════════════════════════════════╝');

  const nameRaw = await ask('\nНазвание страны (Enter — «Новгородия»): ');
  if (nameRaw === null) { rl.close(); return; }
  const countryName = nameRaw.trim() || 'Новгородия';

  console.log('\nВыбор режима:');
  console.log('1 — Реализм: последствия как в реальном мире; абсурд — мелкий штраф к счёту.');
  console.log('2 — Креативизм: мир играет вместе с тобой; абсурд — бонус к счёту, негатив прощается.');

  let mode: GameMode = 'realism';
  for (;;) {
    const c = (await ask('Режим (1/2): '))?.trim();
    if (c === null) { rl.close(); return; }
    if (c === '1') { mode = 'realism'; break; }
    if (c === '2') { mode = 'creative'; break; }
    console.log('Введите 1 или 2.');
  }

  const state = createInitialState(mode, countryName);
  console.log(`\n${countryName} ждёт решений. Срок — ${CONFIG.run.termWeeks} недель.`);
  console.log('Команды: свободный текст действия, «пропустить N» (2–13), «статус», «сдаться».');

  for (;;) {
    printStatus(state);
    if (state.gameOver) break;
    if (state.week > CONFIG.run.termWeeks) break;

    const raw = await ask('\n> ');
    if (raw === null) {
      console.log('\nВвод завершён.');
      rl.close();
      return;
    }
    const cmd = raw.trim();
    if (!cmd) continue;

    if (cmd.toLowerCase() === 'статус') continue; // панель только что напечатана
    if (cmd.toLowerCase() === 'сдаться') {
      await finale(state, llm, 'surrender');
      rl.close();
      return;
    }
    const skipMatch = /^пропустить\s+(\d+)$/i.exec(cmd);
    if (skipMatch) {
      const n = clamp(parseInt(skipMatch[1], 10), CONFIG.run.skipMinWeeks, CONFIG.run.skipMaxWeeks);
      await playTurn(state, llm, null, n);
    } else {
      await playTurn(state, llm, cmd, CONFIG.run.weeksAfterAction);
    }
  }

  // Финал: game over или конец срока.
  if (state.gameOver) {
    await finale(state, llm, null);
    rl.close();
    return;
  }

  // Конец срока: возможно, попытка остаться у власти (7.9).
  let ending = resolveTermEnding(state);
  if (state.stats.powerConcentration >= CONFIG.endings.stayPowerThreshold) {
    const ans = await ask(
      '\nКонцентрация власти достаточна, чтобы попытаться ОСТАТЬСЯ у власти. Попробовать? (да/нет): ',
    );
    if (ans?.trim().toLowerCase() === 'да') {
      if (stayAttemptAutoFails(state)) {
        ending = makeEnding('overthrown', 'Попытка удержать власть провалилась: страна взбунтовалась против президента.');
      } else if (stayAttemptSuccess(state)) {
        ending = makeEnding('for_life', 'Президент удержал власть — теперь это пожизненное правление.');
      } else {
        ending = makeEnding('overthrown', 'Попытка остаться у власти провалилась: элиты и армия отвергли план.');
      }
    }
  }
  await finale(state, llm, null);
  rl.close();
}

main().catch((err) => {
  console.error('Игра завершилась с ошибкой:', err);
  process.exitCode = 1;
});
