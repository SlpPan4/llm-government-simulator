// Localization dictionary: every player-visible UI string, language blocks of
// LLM prompts and MockLLM stubs, in three languages: русский / українська / english.
// The engine and the validator never import this module (project law:
// the engine and the validator know no language at all).

import type {
  GameMode, HardArcId, MoodBand, MoodKey, StatKey,
} from './engine/config.js';
import type { ArcOutcome, ArcOutcomeKey, ChronicleEntry } from './engine/chronicle.js';
import type { HappeningMsg } from './engine/triggers.js';
import type { EndingDescription, EndingId, EndingReason } from './engine/score.js';

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
  actionDone: string; // summary от LLM пуст
  warDeclared: (title: string) => string;
  warNoTarget: string;
  warArcTitle: (neighbor: string) => string; // заголовок арки наступательной войны
  crisisStarted: (title: string, week: number) => string;
  calmWeeks: (from: number, to: number) => string;
  baseEventTitle: (title: string) => string;
  dynamicEventTitle: (title: string, description: string) => string;
  newArc: (title: string, arcId: string) => string;
  arcResolved: (arcId: string, title: string) => string;
  newspaperHeader: string;
  noHappenings: (from: number, to: number) => string;
  amnestyApplied: (floor: number, treasuryCost: number, stabilityCost: number) => string;
  // казна: сумма и пояснение LLM отдельно — единица (млрд/bln) живёт в шаблоне
  consequencesLine: (treasuryAmount: string | null, treasuryNote: string | null, rest: string) => string;
  // заметки хода для narrate-промпта (на языке рана)
  noteWarDeclared: (title: string) => string;
  noteCrisisStarted: (title: string) => string;
  // новости-строки развязок и стадий жёстких арок (7.7) — ключи HappeningMsg
  coupUltimatum: string;
  coupSuppressed: string;
  protestsCalmed: string;
  protestsClashes: string;
  civilWarBegins: string;
  civilWarConsumed: string;
  protestsOrderRestored: string;
  oligarchsBribe: string;
  oligarchsOpposition: string;
  oligarchsOffer: string;
  invasionUltimatum: (neighbor: string) => string;
  invasionRepelled: (neighbor: string) => string;
  invasionSurrender: (neighbor: string) => string;
  warStalemate: (neighbor: string) => string;
  warVictory: (neighbor: string) => string;
  warDefeat: (neighbor: string) => string;
  warContinues: (neighbor: string) => string;
  arcFizzled: (title: string) => string;
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
  // описания концовок от движка (7.9) — рендер EndingReason
  descReelectedClean: string;
  descReelectedWillful: string;
  descHandover: string;
  descCoup: string;
  descCivilWar: string;
  descInvasion: (neighbor: string) => string;
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
  saveVersionMismatch: (found: string, required: number) => string;
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
    saveVersionMismatch: (found, required) => `несовместимая версия сейва (${found}), нужна версия ${required}`,
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
      actionDone: 'Действие выполнено.',
      warDeclared: (title) => `⚠ Объявлена война: ${title}`,
      warNoTarget: '⚠ Война не началась: такого соседа нет.',
      warArcTitle: (neighbor) => `Война: ${neighbor}`,
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
      consequencesLine: (amount, note, rest) =>
        `Последствия: ${[amount ? `казна ${amount} млрд${note ? ` — ${note}` : ''}` : null, rest].filter(Boolean).join(' | ')}`,
      noteWarDeclared: (title) => `объявлена война: ${title}`,
      noteCrisisStarted: (title) => `началась кризисная арка: ${title}`,
      coupUltimatum: '⚠ Телеультиматум генералов: армия требует уступок.',
      coupSuppressed: '⚠ Переворот подавлен: армия осталась верна.',
      protestsCalmed: '⚠ Протесты утихли: президент пошёл на переговоры и выполнил условия оппозиции.',
      protestsClashes: '⚠ Столкновения протестующих с полицией: стабильность падает.',
      civilWarBegins: '💥 Гражданская война началась.',
      civilWarConsumed: '💥 Гражданская война поглотила страну.',
      protestsOrderRestored: '⚠ Восстание подавлено: порядок восстановлен.',
      oligarchsBribe: '⚠ Олигархи предложили сделку — взятка принята. Казна потяжелела, рабочие недовольны.',
      oligarchsOpposition: '⚠ Олигархи финансируют оппозицию.',
      oligarchsOffer: '⚠ Олигархи предлагают «взаимовыгодное сотрудничество».',
      invasionUltimatum: (neighbor) => `⚠ ${neighbor} вручила ультиматум.`,
      invasionRepelled: (neighbor) => `⚠ ${neighbor} отбита! Страна празднует победу.`,
      invasionSurrender: (neighbor) => `💥 Страна капитулировала перед ${neighbor}.`,
      warStalemate: (neighbor) => `⚠ Война с ${neighbor}: фронт держится, казна тает.`,
      warVictory: (neighbor) => `⚠ Победа над ${neighbor}! Репарации пополнили казну.`,
      warDefeat: (neighbor) => `⚠ Позорный мир с ${neighbor}. Страна в трауре.`,
      warContinues: (neighbor) => `⚠ Война с ${neighbor} продолжается: фронт замер.`,
      arcFizzled: (title) =>
        `📖 Сюжет: «${title}» выдохлось — СМИ переключились на новые темы, общество постепенно забыло конфликт.`,
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
      descReelectedClean: 'Честная победа на выборах: страна довольна правлением.',
      descReelectedWillful: 'Волевая победа вопреки настроениям: порядок перевесил недовольство.',
      descHandover: 'Срок окончен: власть мирно передана преемнику.',
      descCoup: 'Военный переворот: армия свергла президента.',
      descCivilWar: 'Гражданская война поглотила страну.',
      descInvasion: (neighbor) => `Страна капитулировала перед ${neighbor}.`,
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
    saveVersionMismatch: (found, required) => `несумісна версія сейву (${found}), потрібна версія ${required}`,
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
      actionDone: 'Дію виконано.',
      warDeclared: (title) => `⚠ Оголошено війну: ${title}`,
      warNoTarget: '⚠ Війна не розпочалася: такого сусіда немає.',
      warArcTitle: (neighbor) => `Війна: ${neighbor}`,
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
      consequencesLine: (amount, note, rest) =>
        `Наслідки: ${[amount ? `скарбниця ${amount} млрд${note ? ` — ${note}` : ''}` : null, rest].filter(Boolean).join(' | ')}`,
      noteWarDeclared: (title) => `оголошено війну: ${title}`,
      noteCrisisStarted: (title) => `розпочалася кризова арка: ${title}`,
      coupUltimatum: '⚠ Телеультиматум генералів: армія вимагає поступок.',
      coupSuppressed: '⚠ Переворот придушено: армія лишилася вірною.',
      protestsCalmed: '⚠ Протести вщухли: президент пішов на переговори й виконав умови опозиції.',
      protestsClashes: '⚠ Зіткнення протестувальників із поліцією: стабільність падає.',
      civilWarBegins: '💥 Громадянська війна почалася.',
      civilWarConsumed: '💥 Громадянська війна поглинула країну.',
      protestsOrderRestored: '⚠ Повстання придушено: порядок відновлено.',
      oligarchsBribe: '⚠ Олігархи запропонували угоду — хабар прийнято. Скарбниця потяжчішала, робітники незадоволені.',
      oligarchsOpposition: '⚠ Олігархи фінансують опозицію.',
      oligarchsOffer: '⚠ Олігархи пропонують «взаємовигідну співпрацю».',
      invasionUltimatum: (neighbor) => `⚠ ${neighbor} вручила ультиматум.`,
      invasionRepelled: (neighbor) => `⚠ ${neighbor} відбита! Країна святкує перемогу.`,
      invasionSurrender: (neighbor) => `💥 Країна капітулювала перед ${neighbor}.`,
      warStalemate: (neighbor) => `⚠ Війна з ${neighbor}: фронт тримається, скарбниця тане.`,
      warVictory: (neighbor) => `⚠ Перемога над ${neighbor}! Репарації поповнили скарбницю.`,
      warDefeat: (neighbor) => `⚠ Ганебний мир із ${neighbor}. Країна в жалобі.`,
      warContinues: (neighbor) => `⚠ Війна з ${neighbor} триває: фронт завмер.`,
      arcFizzled: (title) =>
        `📖 Сюжет: «${title}» видихнувся — ЗМІ перемкнулися на нові теми, суспільство поступово забуло конфлікт.`,
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
      descReelectedClean: 'Чесна перемога на виборах: країна задоволена правлінням.',
      descReelectedWillful: 'Вольова перемога всупереч настроям: порядок перевесив невдоволення.',
      descHandover: 'Термін завершено: владу мирно передано наступнику.',
      descCoup: 'Військовий переворот: армія повалила президента.',
      descCivilWar: 'Громадянська війна поглинула країну.',
      descInvasion: (neighbor) => `Країна капітулювала перед ${neighbor}.`,
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
    saveVersionMismatch: (found, required) => `incompatible save version (${found}), version ${required} required`,
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
      actionDone: 'Action completed.',
      warDeclared: (title) => `⚠ War declared: ${title}`,
      warNoTarget: '⚠ The war never started: there is no such neighbor.',
      warArcTitle: (neighbor) => `War: ${neighbor}`,
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
      consequencesLine: (amount, note, rest) =>
        `Consequences: ${[amount ? `treasury ${amount} bln${note ? ` — ${note}` : ''}` : null, rest].filter(Boolean).join(' | ')}`,
      noteWarDeclared: (title) => `war declared: ${title}`,
      noteCrisisStarted: (title) => `crisis arc started: ${title}`,
      coupUltimatum: '⚠ The generals\' televised ultimatum: the army demands concessions.',
      coupSuppressed: '⚠ The coup was suppressed: the army stayed loyal.',
      protestsCalmed: '⚠ The protests died down: the president negotiated and met the opposition\'s demands.',
      protestsClashes: '⚠ Clashes between protesters and police: stability is falling.',
      civilWarBegins: '💥 The civil war has begun.',
      civilWarConsumed: '💥 The civil war consumed the country.',
      protestsOrderRestored: '⚠ The uprising was suppressed: order is restored.',
      oligarchsBribe: '⚠ The oligarchs offered a deal — the bribe was accepted. The treasury grew heavier, the workers are unhappy.',
      oligarchsOpposition: '⚠ The oligarchs are funding the opposition.',
      oligarchsOffer: '⚠ The oligarchs offer "mutually beneficial cooperation".',
      invasionUltimatum: (neighbor) => `⚠ ${neighbor} has delivered an ultimatum.`,
      invasionRepelled: (neighbor) => `⚠ ${neighbor} was repelled! The country celebrates victory.`,
      invasionSurrender: (neighbor) => `💥 The country surrendered to ${neighbor}.`,
      warStalemate: (neighbor) => `⚠ War with ${neighbor}: the front holds, the treasury melts away.`,
      warVictory: (neighbor) => `⚠ Victory over ${neighbor}! Reparations filled the treasury.`,
      warDefeat: (neighbor) => `⚠ A shameful peace with ${neighbor}. The country mourns.`,
      warContinues: (neighbor) => `⚠ The war with ${neighbor} drags on: the front is frozen.`,
      arcFizzled: (title) =>
        `📖 Story: "${title}" fizzled out — the media moved on to new topics, and society gradually forgot the conflict.`,
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
      descReelectedClean: 'A clean election victory: the country is content with the rule.',
      descReelectedWillful: 'A willful victory despite public moods: order outweighed discontent.',
      descHandover: 'The term is over: power was peacefully handed to a successor.',
      descCoup: 'Military coup: the army overthrew the president.',
      descCivilWar: 'Civil war consumed the country.',
      descInvasion: (neighbor) => `The country surrendered to ${neighbor}.`,
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
  // рендер хроники (ChronicleEntry): движок отдаёт ключи, текст — здесь
  unknownRole: string; // роль персонажа пуста
  arcOutcomeLabels: Record<ArcOutcomeKey, string>;
  chAction: (summary: string) => string;
  chBaseEvent: (title: string) => string;
  chDynamicEvent: (title: string, description: string) => string;
  chNewArc: (title: string) => string;
  chArcProgress: (title: string, eventTitle: string) => string;
  chArcBackground: (title: string, eventTitle: string) => string;
  chArcFinished: (title: string, outcomeLabel: string) => string;
  chCrisisStarted: (arcTitle: string) => string;
  chAmnesty: (floor: number) => string;
  chGameOver: (reason: string) => string;
  chCoupUltimatum: string;
  chProtestsClashes: string;
  chCivilWar: string;
  chHousingBubbleBurst: string;
  chWarAccepted: (neighbor: string) => string;
  chWarRejected: (neighbor: string) => string;
  chWarFailed: string;
  chOligarchsOffer: string;
  chInvasionUltimatum: (neighbor: string) => string;
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
    unknownRole: 'неизвестная роль',
    arcOutcomeLabels: {
      coup_suppressed: 'переворот подавлен',
      protests_calm: 'мирный исход: протесты утихли',
      order_restored: 'порядок восстановлен',
      bribe_accepted: 'взятка принята',
      opposition_funded: 'олигархи финансируют оппозицию',
      invasion_repelled: 'вторжение отбито',
      war_won: 'победа: репарации',
      shameful_peace: 'позорный мир',
      target_unavailable: 'цель недоступна',
      fizzled: 'сошло на нет',
    },
    chAction: (summary) => `Действие: ${summary}`,
    chBaseEvent: (title) => `Событие: ${title}`,
    chDynamicEvent: (title, description) => `⚡ ${title}: ${description}`,
    chNewArc: (title) => `📖 Открыта сюжетная арка «${title}»`,
    chArcProgress: (title, eventTitle) => `Развитие арки «${title}»: ${eventTitle}`,
    chArcBackground: (title, eventTitle) => `Фон кризиса «${title}»: ${eventTitle}`,
    chArcFinished: (title, outcomeLabel) => `Арка «${title}» завершена: ${outcomeLabel}`,
    chCrisisStarted: (arcTitle) => `⚠ Кризис: началась арка «${arcTitle}»`,
    chAmnesty: (floor) =>
      `Великое примирение: замороженные слои разморожены, настроение поднято до ${floor}`,
    chGameOver: (reason) => `Конец правления: ${reason}`,
    chCoupUltimatum: 'Генералы зачитали телеультиматум',
    chProtestsClashes: 'Столкновения протестующих с полицией',
    chCivilWar: 'Страна погрузилась в гражданскую войну',
    chHousingBubbleBurst: 'Лопнул жилищный пузырь: рынок рухнул',
    chWarAccepted: (neighbor) => `Народ принял решение о войне с ${neighbor}`,
    chWarRejected: (neighbor) => `Общество не поверило в оправдание войны с ${neighbor}`,
    chWarFailed: 'Попытка объявить войну провалилась: цель не найдена.',
    chOligarchsOffer: 'Олигархи предложили «взаимовыгодное сотрудничество»',
    chInvasionUltimatum: (neighbor) => `${neighbor} вручила ультиматум`,
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
    unknownRole: 'невідома роль',
    arcOutcomeLabels: {
      coup_suppressed: 'переворот придушено',
      protests_calm: 'мирний фінал: протести вщухли',
      order_restored: 'порядок відновлено',
      bribe_accepted: 'хабар прийнято',
      opposition_funded: 'олігархи фінансують опозицію',
      invasion_repelled: 'вторгнення відбито',
      war_won: 'перемога: репарації',
      shameful_peace: 'ганебний мир',
      target_unavailable: 'ціль недоступна',
      fizzled: 'зійшло на нівець',
    },
    chAction: (summary) => `Дія: ${summary}`,
    chBaseEvent: (title) => `Подія: ${title}`,
    chDynamicEvent: (title, description) => `⚡ ${title}: ${description}`,
    chNewArc: (title) => `📖 Відкрито сюжетну арку «${title}»`,
    chArcProgress: (title, eventTitle) => `Розвиток арки «${title}»: ${eventTitle}`,
    chArcBackground: (title, eventTitle) => `Фон кризису «${title}»: ${eventTitle}`,
    chArcFinished: (title, outcomeLabel) => `Арку «${title}» завершено: ${outcomeLabel}`,
    chCrisisStarted: (arcTitle) => `⚠ Кризис: розпочалася арка «${arcTitle}»`,
    chAmnesty: (floor) =>
      `Велике примирення: заморожені шари розморожено, настрій піднято до ${floor}`,
    chGameOver: (reason) => `Кінець правління: ${reason}`,
    chCoupUltimatum: 'Генерали зачитали телеультиматум',
    chProtestsClashes: 'Зіткнення протестувальників із поліцією',
    chCivilWar: 'Країна поринула в громадянську війну',
    chHousingBubbleBurst: 'Лопнула житлова бульбашка: ринок обвалився',
    chWarAccepted: (neighbor) => `Народ ухвалив рішення про війну з ${neighbor}`,
    chWarRejected: (neighbor) => `Суспільство не повірило у виправдання війни з ${neighbor}`,
    chWarFailed: 'Спроба оголосити війну провалилася: ціль не знайдена.',
    chOligarchsOffer: 'Олігархи запропонували «взаємовигідну співпрацю»',
    chInvasionUltimatum: (neighbor) => `${neighbor} вручила ультиматум`,
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
    unknownRole: 'unknown role',
    arcOutcomeLabels: {
      coup_suppressed: 'coup suppressed',
      protests_calm: 'peaceful outcome: the protests died down',
      order_restored: 'order restored',
      bribe_accepted: 'bribe accepted',
      opposition_funded: 'the oligarchs fund the opposition',
      invasion_repelled: 'invasion repelled',
      war_won: 'victory: reparations',
      shameful_peace: 'shameful peace',
      target_unavailable: 'target unavailable',
      fizzled: 'fizzled out',
    },
    chAction: (summary) => `Action: ${summary}`,
    chBaseEvent: (title) => `Event: ${title}`,
    chDynamicEvent: (title, description) => `⚡ ${title}: ${description}`,
    chNewArc: (title) => `📖 Story arc "${title}" opened`,
    chArcProgress: (title, eventTitle) => `Arc "${title}" develops: ${eventTitle}`,
    chArcBackground: (title, eventTitle) => `Crisis background "${title}": ${eventTitle}`,
    chArcFinished: (title, outcomeLabel) => `Arc "${title}" finished: ${outcomeLabel}`,
    chCrisisStarted: (arcTitle) => `⚠ Crisis: arc "${arcTitle}" has started`,
    chAmnesty: (floor) =>
      `Grand reconciliation: frozen layers thawed, mood raised to ${floor}`,
    chGameOver: (reason) => `End of rule: ${reason}`,
    chCoupUltimatum: 'The generals read out a televised ultimatum',
    chProtestsClashes: 'Clashes between protesters and police',
    chCivilWar: 'The country sank into civil war',
    chHousingBubbleBurst: 'The housing bubble burst: the market collapsed',
    chWarAccepted: (neighbor) => `The people backed the war against ${neighbor}`,
    chWarRejected: (neighbor) => `The public did not believe the justification for war with ${neighbor}`,
    chWarFailed: 'The attempt to declare war failed: target not found.',
    chOligarchsOffer: 'The oligarchs offered "mutually beneficial cooperation"',
    chInvasionUltimatum: (neighbor) => `${neighbor} delivered an ultimatum`,
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

// ─── Engine-facing strings and renderers (law 2) ───
// Движок языка не знает: он хранит и передаёт стабильные id и ключи сообщений.
// Отображаемые имена соседей, названия базовых ивентов и жёстких арок, а также
// рендер ChronicleEntry / HappeningMsg / EndingReason в текст — всё здесь.

// 7.6. Соседи: отображаемые имена на трёх языках (ключ — id из CONFIG.neighbors).
export const NEIGHBOR_NAMES: Record<string, Record<UiLanguage, string>> = {
  north_empire: { ru: 'Северная Империя', uk: 'Північна Імперія', en: 'Northern Empire' },
  kraina: { ru: 'Республика Країн', uk: 'Республіка Країн', en: 'Republic of Kraina' },
};

// 7.7. Названия жёстких арок для игрока.
export const HARD_ARC_TITLES: Record<UiLanguage, Record<HardArcId, string>> = {
  ru: {
    coup: 'Военный переворот',
    protests: 'Протесты → гражданская война',
    oligarchs: 'Олигархи',
    invasion: 'Вторжение соседа',
    offensive_war: 'Война', // полный заголовок — шаблон turn.warArcTitle
  },
  uk: {
    coup: 'Військовий переворот',
    protests: 'Протести → громадянська війна',
    oligarchs: 'Олігархи',
    invasion: 'Вторгнення сусіда',
    offensive_war: 'Війна',
  },
  en: {
    coup: 'Military coup',
    protests: 'Protests → civil war',
    oligarchs: 'Oligarchs',
    invasion: 'Neighbor invasion',
    offensive_war: 'War',
  },
};

// 7.8. Названия базовых ивентов (ключ — id из CONFIG.baseEvents).
export const BASE_EVENT_TITLES: Record<UiLanguage, Record<string, string>> = {
  ru: {
    earthquake: 'Землетрясение в регионе',
    oil_boom: 'Нашли месторождение',
    athlete_win: 'Сборная выиграла чемпионат',
    brain_drain: 'Утечка мозгов',
    scandal: 'Коррупционный скандал в правительстве',
    tech_breakthrough: 'Прорывная отечественная разработка',
    student_unrest: 'Студенческие волнения',
    military_parade: 'Парад укрепил дух нации',
    draft_fail: 'Призыв провалился: призывники не явились',
    science_grant: 'Государственные гранты окупились',
    folk_unity: 'Народный праздник единства',
    tent_city: 'Палаточный городок бездомных у мэрии',
  },
  uk: {
    earthquake: 'Землетрясення в регіоні',
    oil_boom: 'Знайшли родовище',
    athlete_win: 'Збірна виграла чемпіонат',
    brain_drain: 'Витік мозків',
    scandal: 'Корупційний скандал в уряді',
    tech_breakthrough: 'Проривна вітчизняна розробка',
    student_unrest: 'Студентські хвилювання',
    military_parade: 'Парад зміцнив дух нації',
    draft_fail: 'Призов провалився: призовники не з\'явилися',
    science_grant: 'Державні гранти окупилися',
    folk_unity: 'Народне свято єдності',
    tent_city: 'Наметове містечко безпритульних біля мерії',
  },
  en: {
    earthquake: 'Earthquake in the region',
    oil_boom: 'Oil deposit discovered',
    athlete_win: 'The national team won the championship',
    brain_drain: 'Brain drain',
    scandal: 'Corruption scandal in the government',
    tech_breakthrough: 'Breakthrough homegrown development',
    student_unrest: 'Student unrest',
    military_parade: 'The parade lifted the nation\'s spirit',
    draft_fail: 'The draft failed: conscripts never showed up',
    science_grant: 'State grants paid off',
    folk_unity: 'A folk festival of unity',
    tent_city: 'A tent city of the homeless outside city hall',
  },
};

// Отображаемое имя соседа по id; неизвестный id возвращается как есть.
export function neighborName(lang: UiLanguage, id: string | null | undefined): string {
  if (id && NEIGHBOR_NAMES[id]) return NEIGHBOR_NAMES[id][lang];
  return id || '?';
}

// Отображаемое название базового ивента по id.
export function baseEventTitle(lang: UiLanguage, id: string): string {
  return BASE_EVENT_TITLES[lang][id] ?? id;
}

// Заголовок арки для печати: кастомные арки несут свой заголовок (текст LLM
// на языке рана), жёсткие разрешаются по id (+имя цели для наступательной войны).
export function arcTitle(
  lang: UiLanguage,
  arc: { id: string; title: string; warTarget: string | null },
): string {
  if (arc.title) return arc.title;
  if (arc.id === 'offensive_war') {
    return UI_STRINGS[lang].turn.warArcTitle(neighborName(lang, arc.warTarget));
  }
  return HARD_ARC_TITLES[lang][arc.id as HardArcId] ?? arc.id;
}

// Исход завершённой арки: ключ из таблицы 7.7, готовый текст или строка
// из старого сейва (там все исходы — plain-строки).
export function renderArcOutcome(lang: UiLanguage, outcome: ArcOutcome | string): string {
  if (typeof outcome === 'object') return outcome.text;
  return PROMPT_STRINGS[lang].arcOutcomeLabels[outcome as ArcOutcomeKey] ?? outcome;
}

// Причина концовки (7.9) → текст на языке рана.
export function renderEndingReason(lang: UiLanguage, reason: EndingReason | string): string {
  if (typeof reason === 'string') return reason; // старые сейвы
  const f = UI_STRINGS[lang].finale;
  switch (reason.k) {
    case 'reelected_clean': return f.descReelectedClean;
    case 'reelected_willful': return f.descReelectedWillful;
    case 'handover': return f.descHandover;
    case 'coup': return f.descCoup;
    case 'civil_war': return f.descCivilWar;
    case 'invasion': return f.descInvasion(neighborName(lang, reason.neighbor));
  }
}

// Описание концовки: ключ причины от движка или готовый текст от UI-слоя.
export function renderEndingDescription(lang: UiLanguage, d: EndingDescription | string): string {
  if (typeof d === 'string') return d; // старые сейвы
  if (d.k === 'text') return d.text;
  return renderEndingReason(lang, d);
}

// Сообщение о ходе арки (HappeningMsg) → новостная строка на языке рана.
export function renderHappening(lang: UiLanguage, msg: HappeningMsg): string {
  const t = UI_STRINGS[lang].turn;
  const n = (id: string) => neighborName(lang, id);
  switch (msg.k) {
    case 'coupUltimatum': return t.coupUltimatum;
    case 'coupSuppressed': return t.coupSuppressed;
    case 'protestsCalmed': return t.protestsCalmed;
    case 'protestsClashes': return t.protestsClashes;
    case 'civilWarBegins': return t.civilWarBegins;
    case 'civilWarConsumed': return t.civilWarConsumed;
    case 'protestsOrderRestored': return t.protestsOrderRestored;
    case 'oligarchsBribe': return t.oligarchsBribe;
    case 'oligarchsOpposition': return t.oligarchsOpposition;
    case 'oligarchsOffer': return t.oligarchsOffer;
    case 'invasionUltimatum': return t.invasionUltimatum(n(msg.neighbor));
    case 'invasionRepelled': return t.invasionRepelled(n(msg.neighbor));
    case 'invasionSurrender': return t.invasionSurrender(n(msg.neighbor));
    case 'warStalemate': return t.warStalemate(n(msg.neighbor));
    case 'warVictory': return t.warVictory(n(msg.neighbor));
    case 'warDefeat': return t.warDefeat(n(msg.neighbor));
    case 'warContinues': return t.warContinues(n(msg.neighbor));
    case 'arcFizzled': return t.arcFizzled(msg.title);
    case 'gameOver': return renderEndingReason(lang, msg.reason);
  }
}

// Запись хроники (ChronicleEntry) → строка контекста для LLM на языке рана.
// Plain-строки (сейвы до смены формата) проходят как есть.
export function renderChronicleEntry(lang: UiLanguage, entry: ChronicleEntry | string): string {
  if (typeof entry === 'string') return entry;
  const p = PROMPT_STRINGS[lang];
  switch (entry.k) {
    case 'action': return p.chAction(entry.summary);
    case 'baseEvent': return p.chBaseEvent(baseEventTitle(lang, entry.id));
    case 'dynamicEvent': return p.chDynamicEvent(entry.title, entry.description);
    case 'newArc': return p.chNewArc(entry.title);
    case 'arcProgress':
      return p.chArcProgress(
        arcTitle(lang, { id: entry.arc, title: entry.title, warTarget: entry.warTarget }),
        entry.eventTitle,
      );
    case 'arcBackground':
      return p.chArcBackground(
        arcTitle(lang, { id: entry.arc, title: entry.title, warTarget: entry.warTarget }),
        entry.eventTitle,
      );
    case 'arcFinished':
      return p.chArcFinished(
        arcTitle(lang, { id: entry.arc, title: entry.title, warTarget: entry.warTarget }),
        renderArcOutcome(lang, entry.outcome),
      );
    case 'crisisStarted':
      return p.chCrisisStarted(
        entry.arc === 'offensive_war'
          ? UI_STRINGS[lang].turn.warArcTitle(neighborName(lang, entry.neighbor))
          : (HARD_ARC_TITLES[lang][entry.arc as HardArcId] ?? entry.arc),
      );
    case 'amnesty': return p.chAmnesty(entry.floor);
    case 'gameOver': return p.chGameOver(renderEndingReason(lang, entry.reason));
    case 'coupUltimatum': return p.chCoupUltimatum;
    case 'protestsClashes': return p.chProtestsClashes;
    case 'civilWar': return p.chCivilWar;
    case 'housingBubbleBurst': return p.chHousingBubbleBurst;
    case 'warAccepted': return p.chWarAccepted(neighborName(lang, entry.neighbor));
    case 'warRejected': return p.chWarRejected(neighborName(lang, entry.neighbor));
    case 'warFailed': return p.chWarFailed;
    case 'oligarchsOffer': return p.chOligarchsOffer;
    case 'invasionUltimatum': return p.chInvasionUltimatum(neighborName(lang, entry.neighbor));
  }
}
