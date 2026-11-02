// Тесты 7.10: save/load roundtrip, восстановление транскрипта, версия сейва.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  autosavePath, getTranscript, loadGame, resetTranscript, saveGame, savePathFor,
  tee, teeInput, VersionMismatchError, SAVE_VERSION,
} from '../save.js';
import { makeState } from './helpers.js';

const tmpFiles: string[] = [];
afterEach(() => {
  for (const f of tmpFiles.splice(0)) fs.rmSync(f, { force: true });
  resetTranscript();
});

function tmpSave(name: string): string {
  const p = path.join(os.tmpdir(), `tnr-save-test-${process.pid}-${name}.json`);
  tmpFiles.push(p);
  return p;
}

describe('Тест 7.10: save/load roundtrip', () => {
  it('загруженный state deep-equal сохранённому', () => {
    const s = makeState('creative', (st) => {
      st.week = 42;
      st.treasury = -13.5;
      st.arcs.push({
        id: 'кухня', title: 'Кулинарный бунт', kind: 'custom', stage: 2, turns: 3,
        startedWeek: 10, lastUpdateWeek: 40, forceStarted: false, warTarget: null,
        description: 'Повара требуют',
      });
      st.counters.dynamicEvents = 7;
    });
    const p = tmpSave('roundtrip');
    saveGame(s, p);
    resetTranscript();
    const loaded = loadGame(p);
    expect(loaded).toEqual(s);
  });

  it('транскрипт сохраняется и дописывается без шва', () => {
    resetTranscript();
    tee('первая строка');
    teeInput('налоги поднять');
    const p = tmpSave('transcript');
    saveGame(makeState(), p);
    resetTranscript();
    loadGame(p);
    expect(getTranscript()).toContain('первая строка');
    expect(getTranscript()).toContain('> налоги поднять');
    tee('после загрузки');
    expect(getTranscript().endsWith('после загрузки\n')).toBe(true);
  });

  it('несовпадение version — VersionMismatchError, не краш', () => {
    const p = tmpSave('version');
    fs.writeFileSync(p, JSON.stringify({ version: SAVE_VERSION + 1, state: {}, transcript: '' }));
    expect(() => loadGame(p)).toThrow(VersionMismatchError);
  });
});

describe('Тест 7.10: имена файлов сейвов', () => {
  it('autosavePath строится из slug названия страны', () => {
    expect(autosavePath('Новгородия')).toBe(path.join('saves', 'новгородия-autosave.json'));
  });

  it('savePathFor нормализует произвольное имя', () => {
    expect(savePathFor('Моё Сохранение №1')).toBe(path.join('saves', 'моё_сохранение_1.json'));
  });
});
