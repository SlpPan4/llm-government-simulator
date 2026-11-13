// Headless demo run for gameplay GIF recording (npm run demo): drives the same
// banner/status/turn/finale pipeline as the interactive loop in game.ts, but
// without readline and without touching player saves. By default the demo is
// fully offline (MockLLM forced on even if .env says otherwise) and
// reproducible: one seeded RNG feeds both the engine dice and the stub. With
// --live the real API is used (DEEPSEEK_API_KEY required); the seeded RNG still
// drives the engine, but LLM texts are not deterministic and are not tested.

import { CONFIG } from '../engine/config.js';
import { createInitialState } from '../engine/state.js';
import { createLLM, MockLLM, type LLM } from '../llm/client.js';
import { UI_STRINGS, type UiLanguage } from '../i18n.js';
import { getTranscript, resetTranscript, tee } from '../save.js';
import { finale, playTurn, printBanner, printStatus } from '../game.js';
import { createSeededRng } from './rng.js';
import { DEMO_SCRIPT, type DemoScript, type DemoStep } from './script.js';

export const DEFAULT_DEMO_SEED = 20260401;

// Config error with a human-readable message; the CLI turns it into exit code 1.
export class DemoConfigError extends Error {}

export interface DemoOptions {
  live?: boolean;      // --live: real API calls instead of the offline stub
  delayMs?: number;    // --delay: pause between turns for screen recording
  lang?: UiLanguage;   // --lang: run language, overrides the script default
  seed?: number;       // --seed: seed of the engine/stub dice
  script?: DemoScript; // custom scenario (used by tests)
}

// Локализованная команда пропуска недель, как её напечатал бы игрок.
function skipCommand(lang: UiLanguage, n: number): string {
  const verb = UI_STRINGS[lang].commands.skipPattern.source.match(/\^([a-zа-яёіїєґ]+)/i)?.[1];
  return `${verb ?? 'skip'} ${n}`;
}

function stepText(lang: UiLanguage, step: DemoStep): string {
  return 'skip' in step ? skipCommand(lang, step.skip) : step.action;
}

export async function runDemo(options: DemoOptions = {}): Promise<string> {
  const script = options.script ?? DEMO_SCRIPT;
  const lang: UiLanguage = options.lang ?? script.lang;
  const seed = options.seed ?? DEFAULT_DEMO_SEED;
  const delayMs = Math.max(0, options.delayMs ?? 0);
  const live = options.live ?? false;

  const rng = createSeededRng(seed);
  const prevMockFlag = process.env.USE_MOCK_LLM;
  try {
    let llm: LLM;
    if (live) {
      delete process.env.USE_MOCK_LLM;
      if (!process.env.DEEPSEEK_API_KEY) {
        throw new DemoConfigError(
          'DEEPSEEK_API_KEY is required for --live (set it in .env or in the environment)',
        );
      }
      llm = createLLM(lang); // same action cache as the regular game
    } else {
      // Демо офлайн даже если .env говорит иначе: заглушка принудительно включается
      // только на время этого прогона (флаг окружения восстанавливается в finally).
      process.env.USE_MOCK_LLM = 'true';
      llm = new MockLLM(lang, rng);
    }

    resetTranscript();
    const t = UI_STRINGS[lang];
    const state = createInitialState(script.mode, script.countryName, script.setting);

    printBanner(t);
    tee(t.intro(state.countryName, CONFIG.run.termWeeks));
    tee(t.commandsHint);

    const pause = (): Promise<void> => (delayMs > 0
      ? new Promise((resolvePause) => setTimeout(resolvePause, delayMs))
      : Promise.resolve());

    // Действия скрипта выполняются, пока не кончатся, не наступит game over
    // или не выйдет срок правления — как интерактивный цикл в main().
    for (const step of script.steps) {
      if (state.gameOver) break;
      if (state.week > CONFIG.run.termWeeks) break;
      printStatus(state, lang);
      tee(`\n> ${stepText(lang, step)}`);
      if ('skip' in step) {
        await playTurn(state, llm, null, step.skip, lang, rng);
      } else {
        await playTurn(state, llm, step.action, CONFIG.run.weeksAfterAction, lang, rng);
      }
      await pause();
    }

    // Финал идентичен обычной игре: game over посреди срока или конец срока.
    await finale(state, llm, null, lang);
    return getTranscript();
  } finally {
    if (prevMockFlag === undefined) delete process.env.USE_MOCK_LLM;
    else process.env.USE_MOCK_LLM = prevMockFlag;
  }
}
