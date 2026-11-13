// CLI entry for the headless demo (npm run demo). Flags:
//   --live            real API calls (DEEPSEEK_API_KEY required); otherwise the
//                     offline stub is forced on even if .env says otherwise
//   --delay <ms>      pause between turns for screen recording (default 0)
//   --lang ru|uk|en   run language (default: the script's language, en)
//   --out <file>      also write the full transcript to a file
//   --seed <n>        seed of the engine/stub dice (default fixed)
// Everything the run prints goes through tee(), so stdout stays clean:
// banner, statuses, newspapers, finale with the score — no debug lines.

import 'dotenv/config';
import { writeFileSync } from 'node:fs';

import { UI_LANGUAGES, type UiLanguage } from '../i18n.js';
import { DEFAULT_DEMO_SEED, DemoConfigError, runDemo } from './run.js';

const USAGE = 'Usage: npm run demo -- [--live] [--delay <ms>] [--lang ru|uk|en] [--out <file>] [--seed <n>]';

interface CliOptions {
  live: boolean;
  delayMs: number;
  lang: UiLanguage | null;
  out: string | null;
  seed: number;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { live: false, delayMs: 0, lang: null, out: null, seed: DEFAULT_DEMO_SEED };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--live':
        opts.live = true;
        break;
      case '--delay': {
        const v = Number(argv[++i]);
        if (!Number.isFinite(v) || v < 0) throw new DemoConfigError(`invalid --delay value (expected milliseconds): ${argv[i] ?? ''}`);
        opts.delayMs = v;
        break;
      }
      case '--lang': {
        const v = argv[++i];
        if (!v || !UI_LANGUAGES.includes(v as UiLanguage)) {
          throw new DemoConfigError(`invalid --lang value: ${v ?? ''} (expected ru, uk or en)`);
        }
        opts.lang = v as UiLanguage;
        break;
      }
      case '--out': {
        const v = argv[++i];
        if (!v) throw new DemoConfigError('--out requires a file path');
        opts.out = v;
        break;
      }
      case '--seed': {
        const v = Number(argv[++i]);
        if (!Number.isInteger(v)) throw new DemoConfigError(`invalid --seed value (expected integer): ${argv[i] ?? ''}`);
        opts.seed = v;
        break;
      }
      case '--help':
      case '-h':
        throw new DemoConfigError(USAGE); // печатается как сообщение, exit code 0
      default:
        throw new DemoConfigError(`unknown flag: ${arg}\n${USAGE}`);
    }
  }
  return opts;
}

async function main(): Promise<void> {
  let helpRequested = false;
  let opts: CliOptions;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    if (err instanceof DemoConfigError && err.message.startsWith('Usage:')) {
      helpRequested = true;
      opts = { live: false, delayMs: 0, lang: null, out: null, seed: DEFAULT_DEMO_SEED };
    } else {
      throw err;
    }
  }

  if (helpRequested) {
    console.log(USAGE);
    return;
  }

  const transcript = await runDemo({
    live: opts.live,
    delayMs: opts.delayMs,
    lang: opts.lang ?? undefined,
    seed: opts.seed,
  });

  if (opts.out) {
    writeFileSync(opts.out, transcript);
  }
}

main().catch((err) => {
  if (err instanceof DemoConfigError) {
    console.error(`demo: ${err.message}`);
  } else {
    console.error('demo: run failed with an unexpected error:', err);
  }
  process.exitCode = 1;
});
