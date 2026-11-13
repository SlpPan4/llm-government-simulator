// Headless demo (npm run demo): reproducibility + content checks for the
// default offline mode. In --live mode LLM texts are non-deterministic, so the
// identical-transcript guarantee is asserted only for MockLLM.

import { describe, it, expect } from 'vitest';

import { UI_STRINGS } from '../i18n.js';
import { DemoConfigError, runDemo } from '../demo/run.js';

// tee() печатает в консоль — в тестах вывод глушим, транскрипт берём из буфера.
async function silentRun(): Promise<string> {
  const original = console.log;
  console.log = () => {};
  try {
    return await runDemo({ seed: 42 });
  } finally {
    console.log = original;
  }
}

describe('demo run (Tests: headless demo)', () => {
  it('fixed seed replays the identical transcript (MockLLM mode)', async () => {
    const first = await silentRun();
    const second = await silentRun();
    expect(second).toBe(first);
    expect(first.length).toBeGreaterThan(0);
  });

  it('different seeds diverge', async () => {
    const a = await silentRun();
    const original = console.log;
    console.log = () => {};
    let b = '';
    try {
      b = await runDemo({ seed: 43 });
    } finally {
      console.log = original;
    }
    expect(b).not.toBe(a);
  });

  it('transcript contains a newspaper, an arc and the final score', async () => {
    const tr = await silentRun();
    const t = UI_STRINGS.en;
    expect(tr).toContain(t.turn.newspaperHeader); // ─── Newspaper ───
    expect(tr).toContain(t.status.arcsHeader);     // ⚠ Active crises and arcs:
    expect(tr).toContain(t.finale.scoreHeader);    // ─── Score ───
  });

  it('--live without an API key is a clean config error, not a crash', async () => {
    const original = console.log;
    console.log = () => {};
    const prevKey = process.env.DEEPSEEK_API_KEY;
    const prevMock = process.env.USE_MOCK_LLM;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.USE_MOCK_LLM;
    try {
      await expect(runDemo({ live: true })).rejects.toThrow(DemoConfigError);
    } finally {
      console.log = original;
      if (prevKey !== undefined) process.env.DEEPSEEK_API_KEY = prevKey;
      if (prevMock !== undefined) process.env.USE_MOCK_LLM = prevMock;
    }
  });
});
