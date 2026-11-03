// Localization dictionary: every player-visible UI string, language blocks of
// LLM prompts and MockLLM stubs, in three languages: русский / українська / english.
// The engine and the validator never import this module (project law:
// the engine and the validator know no language at all).

import type { GameMode, MoodBand, MoodKey, StatKey } from './engine/config.js';
import type { EndingId } from './engine/score.js';

export const UI_LANGUAGES = ['ru', 'uk', 'en'] as const;
export type UiLanguage = (typeof UI_LANGUAGES)[number];

// Language names for the status panel.
export const LANGUAGE_NAMES: Record<UiLanguage, string> = {
  ru: 'Русский',
  uk: 'Українська',
  en: 'English',
};

// The language menu is shown before the choice, so it is trilingual by design.
export const LANGUAGE_MENU = {
  title: '\nВыбор языка / Вибір мови / Choose language',
  options: ['1 — русский', '2 — українська', '3 — english'],
  prompt: 'Язык / Мова / Language (1/2/3): ',
  invalid: 'Введите 1, 2 или 3. / Введіть 1, 2 або 3. / Enter 1, 2 or 3.',
} as const;

// ─── UI strings (game.ts) ───

export interface StatusStrings {
  weekLine: (week: number, weeksTotal: number, month: number, monthsTotal: number, modeLabel: string, treasury: string) => string;
  langLine: (langName: string) => string;
  settingReply: (setting: string) => string;
  modeLabels: Record<GameMode, string>;
  statLabels: Record<StatKey, string>;
  moodLabels: Record<MoodKey, string>;
  bandLabels: Record<MoodBand, string>;
  absurdLine: (avg: string, ideology: string, mood: string) => string;
  noIdeology: string;
  homelessLine: (homeless: string, arrowHomeless: string, population: string, arrowPopulation: string) => string;
  neighborLine: (name: string, strength: number, relations: string) => string;
  arcsHeader: string;
  arcLine: (title: string, stage: number) => string;
  customMark: string;
  absurdBarLabel: string;
}

export interface CommandStrings {
  status: string[];
  surrender: string[];
  setting: string[];
  save: string[];
  saveQuit: string[];
  skipPattern: RegExp;
  yesWords: string[];
}

export interface TurnStrings {
  actionFailed: string;
  warDeclared: (title: string) => string;
  warNoTarget: string;
  crisisStarted: (title: string, week: number) => string;
  calmWeeks: (from: number, to: number) => string;
  baseEventTitle: (title: string) => string;
  dynamicEventTitle: (title: string, description: string) => string;
  newArc: (title: string, arcId: string) => string;
  arcResolved: (arcId: string, title: string) => string;
  newspaperHeader: string;
  noHappenings: (from: number, to: number) => string;
  amnestyApplied: (floor: number, treasuryCost: number, stabilityCost: number) => string;
  consequencesLine: (treasury: string | null, rest: string) => string;
}

export interface FinaleStrings {
  header: string;
  endingLabel: (label: string) => string;
  epilogueHeader: string;
  scoreHeader: string;
  scoreBase: (base: string, div: number, quotient: string) => string;
  scoreEnding: (label: string, mult: number) => string;
  scoreAbsurd: (avg: string, mod: string) => string;
  total: (total: number) => string;
  epilogueFallback: string;
  endingLabels: Record<EndingId, string>;
  surrenderDescription: string;
  stayPrompt: string;
  stayFailedUnrest: string;
  staySuccess: string;
  stayFailedElites: string;
}

export interface UiStrings {
  bannerTitle: string;
  bannerSubtitle: string;
  countryNamePrompt: string;
  defaultCountryName: string;
  settingPrompt: string;
  defaultSetting: string;
  modeTitle: string;
  modeRealism: string;
  modeCreative: string;
  modePrompt: string;
  invalidMode: string;
  intro: (country: string, weeks: number) => string;
  commandsHint: string;
  inputClosed: string;
  savePrompt: (country: string) => string;
  saveDone: (path: string) => string;
  saveFailed: (msg: string) => string;
  saveNameInvalid: string;
  autosavePrompt: (country: string, week: number, total: number) => string;
  saveVersionMismatch: (found: string) => string;
  loadFailed: (msg: string) => string;
  continueLine: (country: string, week: number) => string;
  status: StatusStrings;
  commands: CommandStrings;
  turn: TurnStrings;
  finale: FinaleStrings;
}

export const UI_STRINGS: Record<UiLanguage, UiStrings> = {
  ru: {
    bannerTitle: 'СИМУЛЯТОР ГОСУДАРСТВА',
    bannerSubtitle: '4 года. 192 недели. Одна власть.',
    countryNamePrompt: '\nНазвание страны (Enter — «Новгородия»): ',
    defaultCountryName: 'Новгородия',
    settingPrompt: '\nСеттинг мира (1–3 предложения; Enter — современность, похожая на наш мир): ',
    defaultSetting: 'Современность, похожая на наш мир',
    modeTitle: '\nВыбор режима:',
    modeRealism: '1 — Реализм: последствия как в реальном мире; абсурд — мелкий штраф к счёту.',
    modeCreative: '2 — Креативизм: мир играет вместе с тобой; абсурд — бонус к счёту, негатив прощается.',
    modePrompt: 'Режим (1/2): ',
    invalidMode: 'Введите 1 или 2.',
    intro: (country, weeks) => `\n${country} ждёт решений. Срок — ${weeks} недель.`,
    commandsHint: 'Команды: свободный текст действия, «пропустить N» (2–13), «статус», «сеттинг», «сохранить», «сохранить и выйти», «сдаться».',
    inputClosed: '\nВвод завершён.',
    savePrompt: (country) => `\nИмя сохранения (Enter — «${country}-save»): `,
    saveDone: (path) => `💾 Сохранено: ${path}`,
    saveFailed: (msg) => `⚠ Не удалось сохранить: ${msg}`,
    saveNameInvalid: 'Имя сохранения не может быть пустым.',
    autosavePrompt: (country, week, total) =>
      `\nНайдено автосохранение: «${country}», неделя ${week}/${total}. Продолжить? (да/нет): `,
    saveVersionMismatch: (found) => `несовместимая версия сейва (${found}), нужна версия 1`,
    loadFailed: (msg) => `⚠ Не удалось загрузить сохранение: ${msg}. Начинается новый ран.`,
    continueLine: (country, week) => `\nПравление «${country}» продолжается. Неделя ${week}.`,
    status: {
      weekLine: (week, weeksTotal, month, monthsTotal, modeLabel, treasury) =>
        `Неделя ${week}/${weeksTotal} (≈${month}/${monthsTotal} мес.) | Режим: ${modeLabel} | Казна: ${treasury} млрд`,
      langLine: (langName) => `Язык: ${langName}`,
      settingReply: (setting) => `Сеттинг: ${setting}`,
      modeLabels: { realism: 'РЕАЛИЗМ', creative: 'КРЕАТИВИЗМ' },
      statLabels: {
        economy: 'Экономика',
        poverty: 'Бедность',
        unemployment: 'Безработица',
        inflation: 'Инфляция',
        freedom: 'Свобода',
        corruption: 'Коррупция',
        stability: 'Стабильность',
        powerConcentration: 'Концентрация власти',
        education: 'Образование',
        technology: 'Технологический прогресс',
        warMood: 'Военное настроение',
      },
      moodLabels: { elites: 'Элиты', military: 'Силовики', workers: 'Рабочие', youth: 'Молодёжь' },
      bandLabels: {
        impeachment: 'импичмент',
        hatred: 'ненависть',
        disliking: 'недолюбие',
        unrest: 'недовольство',
        neutral: 'нейтрально',
        positive: 'позитив',
        love: 'любовь',
      },
      absurdLine: (avg, ideology, mood) =>
        `Средний абсурд рана: ${avg} | Идеология: ${ideology} | Среднее настроение: ${mood}`,
      noIdeology: '—',
      homelessLine: (homeless, arrowHomeless, population, arrowPopulation) =>
        `Бездомность: ${homeless}% ${arrowHomeless} | Население: ${population} млн ${arrowPopulation}`,
      neighborLine: (name, strength, relations) => `  Сосед: ${name} (сила ${strength}, отношения ${relations})`,
      arcsHeader: '⚠ Активные кризисы и арки:',
      arcLine: (title, stage) => `  ⚠ ${title} (стадия ${stage})`,
      customMark: '📖',
      absurdBarLabel: 'Шкала абсурда',
    },
    commands: {
      status: ['статус'],
      surrender: ['сдаться'],
      setting: ['сеттинг'],
      save: ['сохранить'],
      saveQuit: ['сохранить и выйти'],
      skipPattern: /^пропустить\s+(\d+)$/i,
      yesWords: ['да'],
    },
    turn: {
      actionFailed: 'Советники не смогли превратить слова президента в конкретный план. Ничего не изменилось.',
      warDeclared: (title) => `⚠ Объявлена война: ${title}`,
      warNoTarget: '⚠ Война не началась: такого соседа нет.',
      crisisStarted: (title, week) => `⚠ Кризис: «${title}»! Время прервано на неделе ${week}.`,
      calmWeeks: (from, to) => `Недели ${from}–${to} прошли спокойно.`,
      baseEventTitle: (title) => `⚡ Событие: ${title}`,
      dynamicEventTitle: (title, description) => `⚡ Событие: ${title} — ${description}`,
      newArc: (title, arcId) => `📖 Сюжет: открыта арка «${title}» (${arcId})`,
      arcResolved: (arcId, title) => `📖 Сюжет: арка «${arcId}» завершена — ${title}`,
      newspaperHeader: '─── Газета ───',
      noHappenings: (from, to) => `Недели ${from}–${to} прошли без происшествий.`,
      amnestyApplied: (floor, cost, stab) =>
        `🕊 Великое примирение: замороженные слои разморожены, настроение поднято до ${floor}. Цена: казна −${cost} млрд, стабильность −${stab}.`,
      consequencesLine: (treasury, rest) =>
        `Последствия: ${[treasury ? `казна ${treasury} млрд` : null, rest].filter(Boolean).join(' | ')}`,
    },
    finale: {
      header: '\n═══ КОНЕЦ ПРАВЛЕНИЯ ═══',
      endingLabel: (label) => `Концовка: ${label}`,
      epilogueHeader: '\n─── Эпилог ───',
      scoreHeader: '\n─── Счёт ───',
      scoreBase: (base, div, quotient) => `База: ${base} / ${div} = ${quotient}`,
      scoreEnding: (label, mult) => `× концовка (${label}): ${mult}`,
      scoreAbsurd: (avg, mod) => `× абсурд (${avg} средний): ${mod}`,
      total: (total) => `ИТОГО: ${total}`,
      epilogueFallback: 'История ещё напишет об этом правлении.',
      endingLabels: {
        peaceful_handover: 'Мирная передача власти',
        reelected: 'Переизбрание',
        for_life: 'Пожизненное правление',
        overthrown: 'Свержение / отставка',
        collapsed: 'Крах страны',
      },
      surrenderDescription: 'Президент досрочно подал в отставку.',
      stayPrompt: '\nКонцентрация власти достаточна, чтобы попытаться ОСТАТЬСЯ у власти. Попробовать? (да/нет): ',
      stayFailedUnrest: 'Попытка удержать власть провалилась: страна взбунтовалась против президента.',
      staySuccess: 'Президент удержал власть — теперь это пожизненное правление.',
      stayFailedElites: 'Попытка остаться у власти провалилась: элиты и армия отвергли план.',
    },
  },
  uk: {
    bannerTitle: 'СИМУЛЯТОР ДЕРЖАВИ',
    bannerSubtitle: '4 роки. 192 тижні. Одна влада.',
    countryNamePrompt: '\nНазва країни (Enter — «Новгородія»): ',
    defaultCountryName: 'Новгородія',
    settingPrompt: '\nСеттінг світу (1–3 речення; Enter — сучасність, схожа на наш світ): ',
    defaultSetting: 'Сучасність, схожа на наш світ',
    modeTitle: '\nВибір режиму:',
    modeRealism: '1 — Реалізм: наслідки як у реальному світі; абсурд — дрібний штраф до рахунку.',
    modeCreative: '2 — Креативізм: світ грає разом із тобою; абсурд — бонус до рахунку, негатив вибачається.',
    modePrompt: 'Режим (1/2): ',
    invalidMode: 'Введіть 1 або 2.',
    intro: (country, weeks) => `\n${country} чекає на рішення. Термін — ${weeks} тижнів.`,
    commandsHint: 'Команди: вільний текст дії, «пропустити N» (2–13), «статус», «сеттінг», «зберегти», «зберегти і вийти», «здатися».',
    inputClosed: '\nВвід завершено.',
    savePrompt: (country) => `\nІм'я збереження (Enter — «${country}-save»): `,
    saveDone: (path) => `💾 Збережено: ${path}`,
    saveFailed: (msg) => `⚠ Не вдалося зберегти: ${msg}`,
    saveNameInvalid: 'Ім\'я збереження не може бути порожнім.',
    autosavePrompt: (country, week, total) =>
      `\nЗнайдено автозбереження: «${country}», тиждень ${week}/${total}. Продовжити? (так/ні): `,
    saveVersionMismatch: (found) => `несумісна версія сейву (${found}), потрібна версія 1`,
    loadFailed: (msg) => `⚠ Не вдалося завантажити збереження: ${msg}. Починається новий ран.`,
    continueLine: (country, week) => `\nПравління «${country}» продовжується. Тиждень ${week}.`,
    status: {
      weekLine: (week, weeksTotal, month, monthsTotal, modeLabel, treasury) =>
        `Тиждень ${week}/${weeksTotal} (≈${month}/${monthsTotal} міс.) | Режим: ${modeLabel} | Казна: ${treasury} млрд`,
      langLine: (langName) => `Мова: ${langName}`,
      settingReply: (setting) => `Сеттінг: ${setting}`,
      modeLabels: { realism: 'РЕАЛІЗМ', creative: 'КРЕАТИВІЗМ' },
      statLabels: {
        economy: 'Економіка',
        poverty: 'Бідність',
        unemployment: 'Безробіття',
        inflation: 'Інфляція',
        freedom: 'Свобода',
        corruption: 'Корупція',
        stability: 'Стабільність',
        powerConcentration: 'Концентрація влади',
        education: 'Освіта',
        technology: 'Технологічний прогрес',
        warMood: 'Військовий настрій',
      },
      moodLabels: { elites: 'Еліти', military: 'Силовики', workers: 'Робітники', youth: 'Молодь' },
      bandLabels: {
        impeachment: 'імпічмент',
        hatred: 'ненависть',
        disliking: 'недолюблення',
        unrest: 'незадоволеність',
        neutral: 'нейтрально',
        positive: 'позитив',
        love: 'любов',
      },
      absurdLine: (avg, ideology, mood) =>
        `Середній абсурд рану: ${avg} | Ідеологія: ${ideology} | Середній настрій: ${mood}`,
      noIdeology: '—',
      homelessLine: (homeless, arrowHomeless, population, arrowPopulation) =>
        `Безпритульність: ${homeless}% ${arrowHomeless} | Населення: ${population} млн ${arrowPopulation}`,
      neighborLine: (name, strength, relations) => `  Сусід: ${name} (сила ${strength}, відносини ${relations})`,
      arcsHeader: '⚠ Активні кризи та арки:',
      arcLine: (title, stage) => `  ⚠ ${title} (стадія ${stage})`,
      customMark: '📖',
      absurdBarLabel: 'Шкала абсурду',
    },
    commands: {
      status: ['статус'],
      surrender: ['здатися'],
      setting: ['сеттінг'],
      save: ['зберегти'],
      saveQuit: ['зберегти і вийти'],
      skipPattern: /^пропустити\s+(\d+)$/i,
      yesWords: ['так'],
    },
    turn: {
      actionFailed: 'Радники не змогли перетворити слова президента на конкретний план. Нічого не змінилося.',
      warDeclared: (title) => `⚠ Оголошено війну: ${title}`,
      warNoTarget: '⚠ Війна не розпочалася: такого сусіда немає.',
      crisisStarted: (title, week) => `⚠ Кризис: «${title}»! Час перервано на тижні ${week}.`,
      calmWeeks: (from, to) => `Тижні ${from}–${to} минули спокійно.`,
      baseEventTitle: (title) => `⚡ Подія: ${title}`,
      dynamicEventTitle: (title, description) => `⚡ Подія: ${title} — ${description}`,
      newArc: (title, arcId) => `📖 Сюжет: відкрито арку «${title}» (${arcId})`,
      arcResolved: (arcId, title) => `📖 Сюжет: арку «${arcId}» завершено — ${title}`,
      newspaperHeader: '─── Газета ───',
      noHappenings: (from, to) => `Тижні ${from}–${to} минули без пригод.`,
      amnestyApplied: (floor, cost, stab) =>
        `🕊 Велике примирення: заморожені шари розморожено, настрій піднято до ${floor}. Ціна: скарбниця −${cost} млрд, стабільність −${stab}.`,
      consequencesLine: (treasury, rest) =>
        `Наслідки: ${[treasury ? `скарбниця ${treasury} млрд` : null, rest].filter(Boolean).join(' | ')}`,
    },
    finale: {
      header: '\n═══ КІНЕЦЬ ПРАВЛІННЯ ═══',
      endingLabel: (label) => `Кінцівка: ${label}`,
      epilogueHeader: '\n─── Епілог ───',
      scoreHeader: '\n─── Рахунок ───',
      scoreBase: (base, div, quotient) => `База: ${base} / ${div} = ${quotient}`,
      scoreEnding: (label, mult) => `× кінцівка (${label}): ${mult}`,
      scoreAbsurd: (avg, mod) => `× абсурд (${avg} у середньому): ${mod}`,
      total: (total) => `РАЗОМ: ${total}`,
      epilogueFallback: 'Історія ще напише про це правління.',
      endingLabels: {
        peaceful_handover: 'Мирна передача влади',
        reelected: 'Переобрання',
        for_life: 'Пожиттєве правління',
        overthrown: 'Повалення / відставка',
        collapsed: 'Крах країни',
      },
      surrenderDescription: 'Президент достроково подав у відставку.',
      stayPrompt: '\nКонцентрація влади достатня, щоб спробувати ЗАЛИШИТИСЯ при владі. Спробувати? (так/ні): ',
      stayFailedUnrest: 'Спроба втримати владу провалилася: країна збунтувалася проти президента.',
      staySuccess: 'Президент утримав владу — тепер це пожиттєве правління.',
      stayFailedElites: 'Спроба залишитися при владі провалилася: еліти та армія відкинули план.',
    },
  },
  en: {
    bannerTitle: 'STATE SIMULATOR',
    bannerSubtitle: '4 years. 192 weeks. One rule.',
    countryNamePrompt: '\nCountry name (Enter — "Novgorodia"): ',
    defaultCountryName: 'Novgorodia',
    settingPrompt: '\nWorld setting (1–3 sentences; Enter — a modern world much like ours): ',
    defaultSetting: 'A modern world much like ours',
    modeTitle: '\nChoose game mode:',
    modeRealism: '1 — Realism: consequences as in the real world; absurdity is a small score penalty.',
    modeCreative: '2 — Creativism: the world plays along with you; absurdity is a score bonus, negativity is forgiven.',
    modePrompt: 'Mode (1/2): ',
    invalidMode: 'Enter 1 or 2.',
    intro: (country, weeks) => `\n${country} awaits your decisions. Term — ${weeks} weeks.`,
    commandsHint: 'Commands: free-text action, "skip N" (2–13), "status", "setting", "save", "save and quit", "surrender".',
    inputClosed: '\nInput closed.',
    savePrompt: (country) => `\nSave name (Enter — "${country}-save"): `,
    saveDone: (path) => `💾 Saved: ${path}`,
    saveFailed: (msg) => `⚠ Could not save: ${msg}`,
    saveNameInvalid: 'Save name cannot be empty.',
    autosavePrompt: (country, week, total) =>
      `\nAutosave found: "${country}", week ${week}/${total}. Continue? (yes/no): `,
    saveVersionMismatch: (found) => `incompatible save version (${found}), version 1 required`,
    loadFailed: (msg) => `⚠ Could not load the save: ${msg}. Starting a new run.`,
    continueLine: (country, week) => `\nThe rule of "${country}" continues. Week ${week}.`,
    status: {
      weekLine: (week, weeksTotal, month, monthsTotal, modeLabel, treasury) =>
        `Week ${week}/${weeksTotal} (≈${month}/${monthsTotal} mo.) | Mode: ${modeLabel} | Treasury: ${treasury} bln`,
      langLine: (langName) => `Language: ${langName}`,
      settingReply: (setting) => `Setting: ${setting}`,
      modeLabels: { realism: 'REALISM', creative: 'CREATIVISM' },
      statLabels: {
        economy: 'Economy',
        poverty: 'Poverty',
        unemployment: 'Unemployment',
        inflation: 'Inflation',
        freedom: 'Freedom',
        corruption: 'Corruption',
        stability: 'Stability',
        powerConcentration: 'Power concentration',
        education: 'Education',
        technology: 'Technological progress',
        warMood: 'War mood',
      },
      moodLabels: { elites: 'Elites', military: 'Military', workers: 'Workers', youth: 'Youth' },
      bandLabels: {
        impeachment: 'impeachment',
        hatred: 'hatred',
        disliking: 'dislike',
        unrest: 'unrest',
        neutral: 'neutral',
        positive: 'positive',
        love: 'love',
      },
      absurdLine: (avg, ideology, mood) =>
        `Run absurdity (avg): ${avg} | Ideology: ${ideology} | Average mood: ${mood}`,
      noIdeology: '—',
      homelessLine: (homeless, arrowHomeless, population, arrowPopulation) =>
        `Homelessness: ${homeless}% ${arrowHomeless} | Population: ${population} mln ${arrowPopulation}`,
      neighborLine: (name, strength, relations) => `  Neighbor: ${name} (strength ${strength}, relations ${relations})`,
      arcsHeader: '⚠ Active crises and arcs:',
      arcLine: (title, stage) => `  ⚠ ${title} (stage ${stage})`,
      customMark: '📖',
      absurdBarLabel: 'Absurdity scale',
    },
    commands: {
      status: ['status'],
      surrender: ['surrender'],
      setting: ['setting'],
      save: ['save'],
      saveQuit: ['save and quit', 'save and exit'],
      skipPattern: /^skip\s+(\d+)$/i,
      yesWords: ['yes', 'y'],
    },
    turn: {
      actionFailed: 'The advisors could not turn the president\'s words into a concrete plan. Nothing changed.',
      warDeclared: (title) => `⚠ War declared: ${title}`,
      warNoTarget: '⚠ The war never started: there is no such neighbor.',
      crisisStarted: (title, week) => `⚠ Crisis: "${title}"! Time stopped at week ${week}.`,
      calmWeeks: (from, to) => `Weeks ${from}–${to} passed calmly.`,
      baseEventTitle: (title) => `⚡ Event: ${title}`,
      dynamicEventTitle: (title, description) => `⚡ Event: ${title} — ${description}`,
      newArc: (title, arcId) => `📖 Story: arc "${title}" opened (${arcId})`,
      arcResolved: (arcId, title) => `📖 Story: arc "${arcId}" resolved — ${title}`,
      newspaperHeader: '─── Newspaper ───',
      noHappenings: (from, to) => `Weeks ${from}–${to} passed without incidents.`,
      amnestyApplied: (floor, cost, stab) =>
        `🕊 Grand reconciliation: frozen layers are thawed, mood raised to ${floor}. Price: treasury −${cost} bln, stability −${stab}.`,
      consequencesLine: (treasury, rest) =>
        `Consequences: ${[treasury ? `treasury ${treasury} bln` : null, rest].filter(Boolean).join(' | ')}`,
    },
    finale: {
      header: '\n═══ END OF RULE ═══',
      endingLabel: (label) => `Ending: ${label}`,
      epilogueHeader: '\n─── Epilogue ───',
      scoreHeader: '\n─── Score ───',
      scoreBase: (base, div, quotient) => `Base: ${base} / ${div} = ${quotient}`,
      scoreEnding: (label, mult) => `× ending (${label}): ${mult}`,
      scoreAbsurd: (avg, mod) => `× absurdity (${avg} avg): ${mod}`,
      total: (total) => `TOTAL: ${total}`,
      epilogueFallback: 'History has yet to write about this rule.',
      endingLabels: {
        peaceful_handover: 'Peaceful handover',
        reelected: 'Re-election',
        for_life: 'Rule for life',
        overthrown: 'Overthrow / resignation',
        collapsed: 'Collapse of the country',
      },
      surrenderDescription: 'The president resigned early.',
      stayPrompt: '\nPower concentration is enough to try to STAY in power. Try? (yes/no): ',
      stayFailedUnrest: 'The attempt to hold power failed: the country rose against the president.',
      staySuccess: 'The president held on to power — now it is rule for life.',
      stayFailedElites: 'The attempt to stay in power failed: the elites and the army rejected the plan.',
    },
  },
};

// ─── LLM prompt strings (llm/prompts.ts) ───
// System instructions and user-message labels are localized, JSON schema keys
// are not — they stay English for every language (hard invariant).

export interface PromptStrings {
  settingPrefix: string;
  settingRule: string;
  writeIn: string;
  keysEnglish: string;
  tone: Record<GameMode, string>;
  parseRole: string;
  parseRules: string;
  answerSchemaLabel: string;
  stateNumbersLabel: string;
  neighborsLabel: string;
  neighborShort: (strength: number, relations: number) => string;
  actionLabel: string;
  amnestyRule: string;
  treasuryNoteRule: string;
  narrateRole: string;
  narrateRules: string;
  newsFormat: string;
  strictJsonLabel: string;
  narrateDynRules: string;
  stateLabel: string;
  chronicleLabel: string;
  chronicleTail: (limit: number) => string;
  empty: string;
  none: string;
  countersLine: (actions: number, baseEvents: number, dynamicEvents: number, arcsFinished: number, chronicleCollapsed: number) => string;
  activeArcsLabel: string;
  arcEntry: (id: string, title: string, stage: number, description: string) => string;
  arcContinueRule: string;
  arcResolveRule: string;
  consistencyRule: string;
  treasuryRule: string;
  finishedArcsLabel: string;
  charactersLabel: string;
  attitudeLabel: string;
  ideologyLabel: string;
  ideologyNone: string;
  baseEventGiven: (title: string) => string;
  baseEventNone: string;
  cooldownOn: string;
  cooldownOff: string;
  noAction: string;
  turnEventsLabel: string;
  nothing: string;
  epilogueRole: string;
  epilogueTask: (creative: boolean) => string;
  epilogueMention: string;
  endingLine: (country: string, endingLabel: string, scoreTotal: number) => string;
  finalStateLabel: string;
  populationLine: (popStart: string, popEnd: string, changePct: string, notable: boolean) => string;
  fallbackEpilogue: string;
}

export const PROMPT_STRINGS: Record<UiLanguage, PromptStrings> = {
  ru: {
    settingPrefix: 'Сеттинг',
    settingRule: 'Строка «Сеттинг» в начале запроса описывает мир рана. Она влияет только на тексты: названия ивентов, персонажей и новостей, интерпретацию действий. Сеттинг НЕ меняет числа за пределами схемы, НЕ отключает триггеры и НЕ меняет правила игры. Имена соседей и персонажей можно адаптировать под сеттинг в тексте, но их ключи и идентификаторы остаются прежними.',
    writeIn: 'Язык ответа: все строковые значения (summary, названия, описания, новости, имена) пиши строго на русском языке.',
    keysEnglish: 'Ключи JSON-схемы НИКОГДА не переводятся и не изменяются — они всегда английские: summary, actionType, warTarget, effects, mood, treasuryDelta, absurdity, ideologyTags, news, baseEventFlavor, dynamicEvent, epilogue и т.д. Переводятся только строки-значения.',
    tone: {
      realism: 'Режим РЕАЛИЗМ: последствия максимально реалистичны, как в реальном мире. Даже абсурдные действия дают правдоподобные издержки.',
      creative: 'Режим КРЕАТИВИЗМ: играй вместе с игроком — дурацкие действия дают дурацкие, но внутренне логичные последствия; мир реагирует живее и театральнее.',
    },
    parseRole: 'Ты — аналитический движок политической симуляции. Ты превращаешь действие президента в числовые последствия строгим JSON.',
    parseRules: 'Правила: дельты строго в пределах потолков режима; затрагивай 2–4 переменные; даже хорошее действие кому-то не нравится — добавляй и отрицательные реакции; отвечай только валидным JSON без пояснений.',
    answerSchemaLabel: 'Схема ответа',
    stateNumbersLabel: 'Состояние страны (только числа):',
    neighborsLabel: 'Соседи',
    neighborShort: (strength, relations) => `(сила ${strength}, отношения ${relations})`,
    actionLabel: 'Действие президента',
    amnestyRule: 'ПРАВИЛО ПРИМИРЕНИЯ: слой в импичменте (настроение 0) заморожен и не реагирует на обычные действия. Вернуть impeachmentAmnesty: true можно, только если действие — явный и дорогой жест примирения этому слою: амнистия, пакт, раздача активов. Мелкие подачки и рутинные реформы — всегда false.',
    treasuryNoteRule: 'Если treasuryDelta не равен 0, добавь treasuryNote: короткую фразу (до 80 символов), за что именно изменилась казна: «субсидии армии и IT», «налог на недвижимость». Число не дублируй — оно уже в treasuryDelta.',
    narrateRole: 'Ты — главный редактор независимой газеты вымышленной страны.',
    narrateRules: 'Отражай только переданные факты и логические следствия из хроники. Не давай советов президенту.',
    newsFormat: 'Структура news: заголовок + 2–3 заметки + раздел «Голоса города» — 3 реплики жителей от первого лица. Всего до 250 слов.',
    strictJsonLabel: 'Строгий JSON ответа:',
    narrateDynRules: 'Правила динамических событий: масштаб «средний», катастроф уровня войн нельзя; логически следуют из хроники; не противоречат завершённым аркам; предпочитай существующих персонажей, новый — не более одного; если кулдаун активен — dynamicEvent обязан быть null.',
    stateLabel: 'Состояние страны:',
    chronicleLabel: 'Хроника',
    chronicleTail: (limit) => `(последние ${limit} записей):`,
    empty: '(пусто)',
    none: 'нет',
    countersLine: (actions, baseEvents, dynamicEvents, arcsFinished, chronicleCollapsed) =>
      `Сводные счётчики рана: действий ${actions}, базовых ивентов ${baseEvents}, динамических событий ${dynamicEvents}, арок завершено ${arcsFinished}, схлопнуто старых записей хроники ${chronicleCollapsed}.`,
    activeArcsLabel: 'Активные арки',
    arcEntry: (id, title, stage, description) =>
      `id="${id}" «${title}» (стадия ${stage})` + (description ? ` — суть конфликта: ${description}` : ''),
    arcContinueRule: 'ПРАВИЛО АРОК: newArc — только для сюжета, которого НЕТ среди активных арок. Если событие развивает одну из активных арок — верни parentArcId с её id, НЕ newArc. Запрещено открывать арку с названием, дословно повторяющим активную.',
    arcResolveRule: 'ПРАВИЛО ИСХОДОВ АРОК: кастомные (📖) арки живы, пока жив их конфликт. Если действие президента выполнило требование арки или конфликт получил содержательный исход — верни dynamicEvent с parentArcId равным id этой арки и resolvesArc: true: арка завершится, а title события станет её итогом. Пока требование не выполнено — развивай арку: parentArcId с resolvesArc: false. Жёсткие кризисные арки (переворот, протесты, олигархи, вторжение, война) разрешает только движок — не завершай их сам, события лишь отражают их ход.',
    consistencyRule: 'ПРАВИЛО СОГЛАСОВАННОСТИ: news, baseEventFlavor и dynamicEvent — один выпуск одной газеты об одном периоде. Они не должны противоречить друг другу по фактам, статусам персонажей из реестра и состоянию арок: если персонаж возглавил совет в одной заметке, он не может «молчать в заключении» в соседней.',
    treasuryRule: 'ПРАВИЛО КАЗНЫ: эффекты казны должны быть обоснованы самим действием или событием. Реформы, армия, стройки, субсидии — это РАСХОД (отрицательный эффект). Положительный эффект казны допустим, только если в действии явно есть источник дохода (налоги, пошлины, продажа, репарации) — и пропорционален ему.',
    finishedArcsLabel: 'Завершённые арки',
    charactersLabel: 'Персонажи',
    attitudeLabel: 'отношение',
    ideologyLabel: 'Идеологический профиль',
    ideologyNone: 'пока не сформирован',
    baseEventGiven: (title) => `Выпавший базовый ивент (эффекты фиксированы, перепиши только название и описание): ${title}`,
    baseEventNone: 'Базовый ивент не выпал.',
    cooldownOn: 'КУЛДАУН ДИНАМИЧЕСКИХ СОБЫТИЙ АКТИВЕН: dynamicEvent обязан быть null.',
    cooldownOff: 'Кулдаун неактивен.',
    noAction: 'Действия не было.',
    turnEventsLabel: 'События хода',
    nothing: 'ничего значимого',
    epilogueRole: 'Ты — историк.',
    epilogueTask: (creative) => 'Напиши эпилог 150–200 слов: что стало со страной и президентом через 10 лет после окончания правления. Тон честный и чуть меланхоличный.'
      + (creative ? ' С оглядкой на абсурдность случившегося.' : ''),
    epilogueMention: 'Можешь упоминать персонажей реестра и ключевые события хроники.',
    endingLine: (country, endingLabel, scoreTotal) => `Страна: ${country}. Концовка: ${endingLabel}. Итоговый счёт: ${scoreTotal}.`,
    finalStateLabel: 'Финальное состояние:',
    populationLine: (popStart, popEnd, changePct, notable) =>
      `Население на старте: ${popStart} млн, в конце: ${popEnd} млн (изменение ${changePct}%).`
      + (notable ? ' Изменение заметное — обязательно упомяни демографические последствия (рождаемость, эмиграцию, старение).' : ''),
    fallbackEpilogue: 'История ещё напишет об этом правлении — пока рано подводить итоги.',
  },
  uk: {
    settingPrefix: 'Сеттінг',
    settingRule: 'Рядок «Сеттінг» на початку запиту описує світ рану. Він впливає лише на тексти: назви івентів, персонажів і новин, інтерпретацію дій. Сеттінг НЕ змінює числа поза схемою, НЕ вимикає тригери і НЕ змінює правила гри. Імена сусідів і персонажів можна адаптувати під сеттінг у тексті, але їхні ключі та ідентифікатори лишаються колишніми.',
    writeIn: 'Мова відповіді: усі рядкові значення (summary, назви, описи, новини, імена) пиши українською мовою.',
    keysEnglish: 'Ключі JSON-схеми НІКОЛИ не перекладаються і не змінюються — вони завжди англійські: summary, actionType, warTarget, effects, mood, treasuryDelta, absurdity, ideologyTags, news, baseEventFlavor, dynamicEvent, epilogue тощо. Перекладаються лише рядки-значення.',
    tone: {
      realism: 'Режим РЕАЛІЗМ: наслідки максимально реалістичні, як у реальному світі. Навіть абсурдні дії дають правдоподібні витрати.',
      creative: 'Режим КРЕАТИВІЗМ: грай разом із гравцем — дурні дії дають дурні, але внутрішньо логічні наслідки; світ реагує живіше та театральніше.',
    },
    parseRole: 'Ти — аналітичний рушій політичної симуляції. Ти перетворюєш дію президента на числові наслідки строгим JSON.',
    parseRules: 'Правила: дельти суворо в межах стель режиму; зачіпай 2–4 змінні; навіть хороша дія комусь не подобається — додавай і негативні реакції; відповідай лише валідним JSON без пояснень.',
    answerSchemaLabel: 'Схема відповіді',
    stateNumbersLabel: 'Стан країни (лише числа):',
    neighborsLabel: 'Сусіди',
    neighborShort: (strength, relations) => `(сила ${strength}, відносини ${relations})`,
    actionLabel: 'Дія президента',
    amnestyRule: 'ПРАВИЛО ПРИМИРЕННЯ: шар в імпічменті (настрій 0) заморожений і не реагує на звичайні дії. Повернути impeachmentAmnesty: true можна, лише якщо дія — явний і дорогий жест примирення цьому шару: амністія, пакт, роздача активів. Дрібні подачки та рутинні реформи — завжди false.',
    treasuryNoteRule: 'Якщо treasuryDelta не дорівнює 0, додай treasuryNote: коротку фразу (до 80 символів), за що саме змінилася скарбниця: «субсидії армії та IT», «податок на нерухомість». Число не дублюй — воно вже в treasuryDelta.',
    narrateRole: 'Ти — головний редактор незалежної газети вигаданої країни.',
    narrateRules: 'Відображай лише передані факти й логічні наслідки з хроніки. Не давай порад президенту.',
    newsFormat: 'Структура news: заголовок + 2–3 нотатки + розділ «Голоси міста» — 3 репліки мешканців від першої особи. Всього до 250 слів.',
    strictJsonLabel: 'Суворий JSON відповіді:',
    narrateDynRules: 'Правила динамічних подій: масштаб «середній», катастроф рівня воєн не можна; логічно випливають з хроніки; не суперечать завершеним аркам; надавай перевагу наявним персонажам, новий — не більш ніж один; якщо кулдаун активний — dynamicEvent мусить бути null.',
    stateLabel: 'Стан країни:',
    chronicleLabel: 'Хроніка',
    chronicleTail: (limit) => `(останні ${limit} записів):`,
    empty: '(порожньо)',
    none: 'немає',
    countersLine: (actions, baseEvents, dynamicEvents, arcsFinished, chronicleCollapsed) =>
      `Зведені лічильники рану: дій ${actions}, базових івентів ${baseEvents}, динамічних подій ${dynamicEvents}, арок завершено ${arcsFinished}, згорнуто старих записів хроніки ${chronicleCollapsed}.`,
    activeArcsLabel: 'Активні арки',
    arcEntry: (id, title, stage, description) =>
      `id="${id}" «${title}» (стадія ${stage})` + (description ? ` — суть конфлікту: ${description}` : ''),
    arcContinueRule: 'ПРАВИЛО АРОК: newArc — лише для сюжету, якого НЕМАЄ серед активних арок. Якщо подія розвиває одну з активних арок — поверни parentArcId з її id, НЕ newArc. Заборонено відкривати арку з назвою, що дослівно повторює активну.',
    arcResolveRule: 'ПРАВИЛО ФІНАЛІВ АРОК: кастомні (📖) арки живі, поки живий їхній конфлікт. Якщо дія президента виконала вимогу арки або конфлікт отримав змістовний фінал — поверни dynamicEvent з parentArcId, що дорівнює id цієї арки, і resolvesArc: true: арка завершиться, а title події стане її підсумком. Доки вимога не виконана — розвивай арку: parentArcId з resolvesArc: false. Жорсткі кризові арки (переворот, протести, олігархи, вторгнення, війну) розв\'язує лише рушій — не завершуй їх сам, події лише відображають їхній перебіг.',
    consistencyRule: 'ПРАВИЛО УЗГОДЖЕНОСТІ: news, baseEventFlavor і dynamicEvent — один випуск однієї газети про один період. Вони не повинні суперечити одна одній за фактами, статусами персонажів із реєстру та станом арок: якщо персонаж очолив раду в одній нотатці, він не може «мовчати в ув\'язненні» в сусідній.',
    treasuryRule: 'ПРАВИЛО КАЗНИ: ефекти казни мають бути обґрунтовані самою дією або подією. Реформи, армія, будівництво, субсидії — це ВИТРАТА (негативний ефект). Додатний ефект казни допустимий, лише якщо в дії явно є джерело доходу (податки, мита, продаж, репарації) — і пропорційний йому.',
    finishedArcsLabel: 'Завершені арки',
    charactersLabel: 'Персонажі',
    attitudeLabel: 'відношення',
    ideologyLabel: 'Ідеологічний профіль',
    ideologyNone: 'поки не сформований',
    baseEventGiven: (title) => `Випавший базовий івент (ефекти зафіксовані, перепиши лише назву та опис): ${title}`,
    baseEventNone: 'Базовий івент не випав.',
    cooldownOn: 'КУЛДАУН ДИНАМІЧНИХ ПОДІЙ АКТИВНИЙ: dynamicEvent мусить бути null.',
    cooldownOff: 'Кулдаун неактивний.',
    noAction: 'Дії не було.',
    turnEventsLabel: 'Події ходу',
    nothing: 'нічого значущого',
    epilogueRole: 'Ти — історик.',
    epilogueTask: (creative) => 'Напиши епілог 150–200 слів: що стало з країною та президентом через 10 років після завершення правління. Тон чесний і трохи меланхолійний.'
      + (creative ? ' З оглядом на абсурдність того, що сталося.' : ''),
    epilogueMention: 'Можеш згадувати персонажів реєстру та ключові події хроніки.',
    endingLine: (country, endingLabel, scoreTotal) => `Країна: ${country}. Кінцівка: ${endingLabel}. Підсумковий рахунок: ${scoreTotal}.`,
    finalStateLabel: 'Фінальний стан:',
    populationLine: (popStart, popEnd, changePct, notable) =>
      `Населення на старті: ${popStart} млн, в кінці: ${popEnd} млн (зміна ${changePct}%).`
      + (notable ? ' Зміна помітна — обов\'язково згадай демографічні наслідки (народжуваність, еміграцію, старіння).' : ''),
    fallbackEpilogue: 'Історія ще напише про це правління — поки зарано підбивати підсумки.',
  },
  en: {
    settingPrefix: 'Setting',
    settingRule: 'The "Setting" line at the start of the request describes the run\'s world. It affects texts only: event, character and news titles, and the interpretation of actions. The setting must NOT change numbers beyond the schema, disable triggers, or change the game rules. You may adapt neighbor and character names to the setting in the text, but their keys and identifiers stay the same.',
    writeIn: 'Response language: write all string values (summary, titles, descriptions, news, names) in English.',
    keysEnglish: 'JSON schema keys are NEVER translated or altered — they always stay English: summary, actionType, warTarget, effects, mood, treasuryDelta, absurdity, ideologyTags, news, baseEventFlavor, dynamicEvent, epilogue, etc. Only string values are translated.',
    tone: {
      realism: 'REALISM mode: consequences are as realistic as possible, as in the real world. Even absurd actions bring plausible costs.',
      creative: 'CREATIVISM mode: play along with the player — silly actions produce silly but internally logical consequences; the world reacts more vividly and theatrically.',
    },
    parseRole: 'You are the analytical engine of a political simulation. You turn the president\'s action into numeric consequences as strict JSON.',
    parseRules: 'Rules: deltas stay strictly within the mode caps; touch 2–4 variables; even a good action displeases someone — add negative reactions too; reply with valid JSON only, no explanations.',
    answerSchemaLabel: 'Answer schema',
    stateNumbersLabel: 'Country state (numbers only):',
    neighborsLabel: 'Neighbors',
    neighborShort: (strength, relations) => `(strength ${strength}, relations ${relations})`,
    actionLabel: 'President\'s action',
    amnestyRule: 'RECONCILIATION RULE: a layer in impeachment (mood 0) is frozen and does not react to ordinary actions. Return impeachmentAmnesty: true only if the action is an explicit, costly gesture of reconciliation toward that layer: amnesty, a pact, handing out assets. Small handouts and routine reforms are always false.',
    treasuryNoteRule: 'If treasuryDelta is not 0, add treasuryNote: a short phrase (up to 80 characters) stating what the treasury change paid for: "subsidies for the army and IT", "property tax". Do not repeat the number — it is already in treasuryDelta.',
    narrateRole: 'You are the editor-in-chief of an independent newspaper in a fictional country.',
    narrateRules: 'Report only the given facts and logical consequences from the chronicle. Do not give the president any advice.',
    newsFormat: 'Structure of news: headline + 2–3 items + a "Voices of the city" section — 3 first-person quotes from residents. Up to 250 words total.',
    strictJsonLabel: 'Strict JSON response:',
    narrateDynRules: 'Dynamic event rules: "medium" scale, no war-level catastrophes; they must follow logically from the chronicle; they must not contradict finished arcs; prefer existing characters, at most one new character; if the cooldown is active, dynamicEvent must be null.',
    stateLabel: 'Country state:',
    chronicleLabel: 'Chronicle',
    chronicleTail: (limit) => `(last ${limit} entries):`,
    empty: '(empty)',
    none: 'none',
    countersLine: (actions, baseEvents, dynamicEvents, arcsFinished, chronicleCollapsed) =>
      `Run counters: actions ${actions}, base events ${baseEvents}, dynamic events ${dynamicEvents}, arcs finished ${arcsFinished}, collapsed old chronicle entries ${chronicleCollapsed}.`,
    activeArcsLabel: 'Active arcs',
    arcEntry: (id, title, stage, description) =>
      `id="${id}" "${title}" (stage ${stage})` + (description ? ` — the conflict: ${description}` : ''),
    arcContinueRule: 'ARC RULE: newArc is only for a plot that is NOT among the active arcs. If the event develops one of the active arcs, return parentArcId with its id, NOT newArc. Opening an arc whose title literally repeats an active one is forbidden.',
    arcResolveRule: 'ARC OUTCOMES RULE: custom (📖) arcs live as long as their conflict lives. If the president\'s action fulfilled the arc\'s requirement or the conflict reached a meaningful outcome, return dynamicEvent with parentArcId set to that arc\'s id and resolvesArc: true: the arc ends and the event title becomes its outcome. While the requirement is unmet, develop the arc: parentArcId with resolvesArc: false. Hard crisis arcs (coup, protests, oligarchs, invasion, war) are resolved by the engine only — do not finish them yourself; events merely reflect their course.',
    consistencyRule: 'CONSISTENCY RULE: news, baseEventFlavor and dynamicEvent are a single issue of a single newspaper covering a single period. They must not contradict each other on facts, registry character statuses and arc states: if a character heads a council in one item, they cannot be "silently imprisoned" in another.',
    treasuryRule: 'TREASURY RULE: treasury effects must be justified by the action or event itself. Reforms, the military, construction, subsidies are COSTS (negative effect). A positive treasury effect is allowed only if the action explicitly contains a revenue source (taxes, tariffs, sales, reparations) — and proportional to it.',
    finishedArcsLabel: 'Finished arcs',
    charactersLabel: 'Characters',
    attitudeLabel: 'attitude',
    ideologyLabel: 'Ideology profile',
    ideologyNone: 'not formed yet',
    baseEventGiven: (title) => `Rolled base event (effects are fixed, rewrite only the title and description): ${title}`,
    baseEventNone: 'No base event rolled.',
    cooldownOn: 'DYNAMIC EVENT COOLDOWN IS ACTIVE: dynamicEvent must be null.',
    cooldownOff: 'Cooldown is inactive.',
    noAction: 'No action was taken.',
    turnEventsLabel: 'Turn events',
    nothing: 'nothing significant',
    epilogueRole: 'You are a historian.',
    epilogueTask: (creative) => 'Write a 150–200 word epilogue: what became of the country and the president 10 years after the rule ended. The tone is honest and slightly melancholic.'
      + (creative ? ' With an eye to the absurdity of what happened.' : ''),
    epilogueMention: 'You may mention registry characters and key chronicle events.',
    endingLine: (country, endingLabel, scoreTotal) => `Country: ${country}. Ending: ${endingLabel}. Final score: ${scoreTotal}.`,
    finalStateLabel: 'Final state:',
    populationLine: (popStart, popEnd, changePct, notable) =>
      `Population at the start: ${popStart} mln, at the end: ${popEnd} mln (change ${changePct}%).`
      + (notable ? ' The change is significant — be sure to mention the demographic consequences (birth rate, emigration, aging).' : ''),
    fallbackEpilogue: 'History has yet to write about this rule — it is too early for final judgments.',
  },
};

// ─── MockLLM stub strings (llm/client.ts) ───

export interface MockStrings {
  warSummary: (target: string) => string;
  defaultSummary: (action: string) => string;
  noNotes: string;
  newsWeek: (country: string, week: number) => string;
  newsMainAction: (summary: string) => string;
  newsNoAction: string;
  newsNotes: (notes: string) => string;
  newsVoices: string;
  flavorSuffix: string;
  flavorDescription: (title: string) => string;
  dynTitle: string;
  dynDescription: string;
  epilogue: (country: string, endingLabel: string, popNow: string, popStart: string, scoreTotal: number) => string;
}

export const MOCK_STRINGS: Record<UiLanguage, MockStrings> = {
  ru: {
    warSummary: (target) => `Президент объявляет войну: ${target}.`,
    defaultSummary: (action) => `Правительство запускает инициативу «${action}»; последствия ощущаются в обществе.`,
    noNotes: 'особых событий не было',
    newsWeek: (country, week) => `«${country}», неделя ${week}.`,
    newsMainAction: (summary) => `Главная тема: ${summary}.`,
    newsNoAction: 'Неделя прошла без громких решений.',
    newsNotes: (notes) => `Итоги периода: ${notes}.`,
    newsVoices: 'Голоса города: «Надеемся на лучшее», «Политика — грязное дело», «Главное — стабильность».',
    flavorSuffix: '— подробности',
    flavorDescription: (title) => `Корреспонденты разбираются в ситуации: «${title}». Власти пока воздерживаются от комментариев.`,
    dynTitle: 'Слухи в торговых рядах',
    dynDescription: 'Купцы обсуждают перемены и ждут ясности от правительства.',
    epilogue: (country, endingLabel, popNow, popStart, scoreTotal) =>
      `Прошло десять лет. ${country} помнит это правление — иначе, чем ожидали. Концовка: ${endingLabel}. Историки спорят, была ли цена оправдана, а население (${popNow} млн против ${popStart} млн на старте) просто живёт дальше. Счёт историков: ${scoreTotal}.`,
  },
  uk: {
    warSummary: (target) => `Президент оголошує війну: ${target}.`,
    defaultSummary: (action) => `Уряд запускає ініціативу «${action}»; наслідки відчуваються в суспільстві.`,
    noNotes: 'особливих подій не було',
    newsWeek: (country, week) => `«${country}», тиждень ${week}.`,
    newsMainAction: (summary) => `Головна тема: ${summary}.`,
    newsNoAction: 'Тиждень минув без гучних рішень.',
    newsNotes: (notes) => `Підсумки періоду: ${notes}.`,
    newsVoices: 'Голоси міста: «Сподіваємося на краще», «Політика — брудна справа», «Головне — стабільність».',
    flavorSuffix: '— подробиці',
    flavorDescription: (title) => `Кореспонденти розбираються в ситуації: «${title}». Влада поки утримується від коментарів.`,
    dynTitle: 'Чутки в торгових рядах',
    dynDescription: 'Купці обговорюють зміни і чекають ясності від уряду.',
    epilogue: (country, endingLabel, popNow, popStart, scoreTotal) =>
      `Минуло десять років. ${country} пам'ятає це правління — інакше, ніж очікували. Кінцівка: ${endingLabel}. Історики сперечаються, чи була ціна виправдана, а населення (${popNow} млн проти ${popStart} млн на старті) просто живе далі. Рахунок істориків: ${scoreTotal}.`,
  },
  en: {
    warSummary: (target) => `The president declares war on ${target}.`,
    defaultSummary: (action) => `The government launches the initiative "${action}"; the effects are felt across society.`,
    noNotes: 'no special events',
    newsWeek: (country, week) => `"${country}", week ${week}.`,
    newsMainAction: (summary) => `Main topic: ${summary}.`,
    newsNoAction: 'The week passed without loud decisions.',
    newsNotes: (notes) => `Period results: ${notes}.`,
    newsVoices: 'Voices of the city: "We hope for the best", "Politics is a dirty business", "Stability is what matters".',
    flavorSuffix: '— details',
    flavorDescription: (title) => `Correspondents are looking into the situation: "${title}". The authorities have so far declined to comment.`,
    dynTitle: 'Rumors in the market rows',
    dynDescription: 'Merchants discuss the changes and await clarity from the government.',
    epilogue: (country, endingLabel, popNow, popStart, scoreTotal) =>
      `Ten years have passed. ${country} remembers this rule — differently than expected. Ending: ${endingLabel}. Historians argue whether the price was justified, while the population (${popNow} mln vs ${popStart} mln at the start) simply lives on. Historians' score: ${scoreTotal}.`,
  },
};
