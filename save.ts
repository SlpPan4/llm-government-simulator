// Система сохранений (7.10): «тройник» транскрипта + save/load одного JSON.
// Весь вывод игры идёт через tee() — в консоль и в буфер транскрипта;
// весь ввод игрока дописывается через teeInput(). GameState обязан быть
// plain-serializable (без Map/Set/функций) — вся сериализация тут.

import fs from 'node:fs';
import path from 'node:path';
import { normalizeArcId } from './engine/state.js';

export const SAVE_VERSION = 1;
export const SAVES_DIR = 'saves';

// Отдельный класс, чтобы game.ts мог показать локализованное сообщение
// о несовместимой версии сейва вместо сырого стектрейса.
export class VersionMismatchError extends Error {
  constructor(readonly found: unknown) {
    super(`несовместимая версия сейва: ${String(found)}`);
  }
}

let transcript = '';

export function tee(s: string): void {
  transcript += s + '\n';
  console.log(s);
}

export function teeInput(s: string): void {
  transcript += '> ' + s + '\n';
}

export function getTranscript(): string {
  return transcript;
}

export function resetTranscript(): void {
  transcript = '';
}

// Имя файла внутри saves/ из произвольной строки (название страны, имя сейва).
export function savePathFor(name: string): string {
  const slug = normalizeArcId(name) || 'save';
  return path.join(SAVES_DIR, `${slug}.json`);
}

// Автосейв после каждого хода: saves/<страна>-autosave.json (7.10).
export function autosavePath(countryName: string): string {
  const slug = normalizeArcId(countryName) || 'country';
  return path.join(SAVES_DIR, `${slug}-autosave.json`);
}

export function saveGame(state: unknown, filePath: string): string {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(
    { version: SAVE_VERSION, savedAt: new Date().toISOString(), state, transcript },
    null,
    2,
  ));
  return filePath;
}

// Восстанавливает транскрипт из файла: дальнейшая игра дописывает в него же.
// Несовпадение version — VersionMismatchError, а не краш (7.10).
export function loadGame(filePath: string): unknown {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
    version?: unknown; transcript?: unknown; state?: unknown;
  };
  if (data.version !== SAVE_VERSION) throw new VersionMismatchError(data.version);
  transcript = typeof data.transcript === 'string' ? data.transcript : '';
  return data.state;
}
