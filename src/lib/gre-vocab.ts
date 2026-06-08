export type Rating = "forgot" | "hard" | "good" | "easy";

export type MemoryStatus =
  | "new"
  | "learning"
  | "reviewing"
  | "at_risk"
  | "mastered";

export type FrequencyTag = "high" | "medium" | "low";

export type QuizChoice = {
  key: string;
  word: string;
};

export type QuizBlank = {
  id: string;
  label: string;
  choices: QuizChoice[];
  answerKeys?: string[];
  requiredCount?: 1 | 2;
};

export type QuizQuestion = {
  prompt: string;
  choices: string[];
  answer?: string;
  answerExplanation?: string;
  source?: string;
  type?: "single-blank" | "multi-blank" | "sentence-equivalence";
  blanks?: QuizBlank[];
  targetWord?: string;
  hasOfficialAnswer?: boolean;
  testNumber?: number;
  sectionNumber?: number;
  questionNumber?: number;
};

export type Word = {
  id: string;
  word: string;
  phonetic?: string;
  coreMeaningCn: string;
  coreMeaningEn: string;
  greMeanings: string[];
  example: string;
  translation: string;
  synonyms: string[];
  antonyms: string[];
  roots?: string[];
  affixes?: string[];
  visualKeyword: string;
  visualScene: string;
  imagePrompt: string;
  imageUrl?: string;
  memoryHookCn: string;
  quizQuestion?: QuizQuestion;
  difficultyLevel: 1 | 2 | 3 | 4 | 5;
  frequencyTag: FrequencyTag;
  categoryTags: string[];
  confusingWith?: string;
  source?: string;
};

export function getWordAssetImage(word: Pick<Word, "id">) {
  return `/asset/word-images/w-${word.id}.svg`;
}

export type UserWordMemory = {
  wordId: string;
  status: MemoryStatus;
  easeFactor: number;
  intervalDays: number;
  repetitionCount: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  correctCount: number;
  wrongCount: number;
  lastRating?: Rating;
  manualWeak?: boolean;
};

export type TrainerSettings = {
  dailyTarget: 200 | 300 | 500;
  sessionSize: 5 | 8 | 10;
  breakReminder: boolean;
  visualMode: boolean;
  focusDefault: boolean;
  darkMode: boolean;
  exampleLevel: "simple" | "gre" | "advanced";
  chineseDetail: "brief" | "standard" | "detailed";
};

export const defaultSettings: TrainerSettings = {
  dailyTarget: 300,
  sessionSize: 8,
  breakReminder: true,
  visualMode: true,
  focusDefault: false,
  darkMode: false,
  exampleLevel: "gre",
  chineseDetail: "standard",
};

export const seedWords: Word[] = [
  {
    id: "aberrant",
    word: "aberrant",
    phonetic: "/ae'berənt/",
    coreMeaningCn: "异常的，偏离常规的",
    coreMeaningEn: "deviating from what is normal or expected",
    greMeanings: ["deviant", "abnormal", "departing from the usual course"],
    example:
      "The committee was alarmed by the candidate's aberrant behavior during the interview.",
    translation: "委员会对候选人在面试中的异常行为感到担忧。",
    synonyms: ["deviant", "abnormal", "atypical"],
    antonyms: ["normal", "conventional", "typical"],
    roots: ["err: wander, make a mistake"],
    visualKeyword: "wrong-way ant",
    visualScene:
      "A tiny ant leaves a straight marching line and walks toward a glowing wrong-way sign.",
    imagePrompt:
      "calm editorial illustration of an ant leaving a line of ants, soft blue green palette",
    memoryHookCn:
      "aberrant = a + err + ant，一只走错路的 ant，偏离正常路线。",
    difficultyLevel: 3,
    frequencyTag: "high",
    categoryTags: ["abstract", "behavior"],
    confusingWith: "aberration",
  },
  {
    id: "laconic",
    word: "laconic",
    phonetic: "/lə'kɑːnɪk/",
    coreMeaningCn: "简洁的，话少的",
    coreMeaningEn: "using very few words",
    greMeanings: ["brief", "terse", "not verbose"],
    example: "His laconic reply made the room feel tense.",
    translation: "他简短的回答让房间里的气氛变得紧张。",
    synonyms: ["terse", "succinct", "concise"],
    antonyms: ["verbose", "garrulous", "wordy"],
    roots: ["lacon: Spartan speech"],
    visualKeyword: "zipped mouth",
    visualScene:
      "A person with a zipped mouth calmly holds a small card that says OK.",
    imagePrompt:
      "minimal illustration of a person with a zipper mouth holding an OK sign",
    memoryHookCn: "laconic 像 lack + sonic，缺少声音，所以话很少。",
    difficultyLevel: 2,
    frequencyTag: "high",
    categoryTags: ["personality", "speech"],
    confusingWith: "verbose",
  },
  {
    id: "austere",
    word: "austere",
    phonetic: "/ɔː'stɪr/",
    coreMeaningCn: "朴素严厉的，苦行的",
    coreMeaningEn: "severe, plain, or without comfort",
    greMeanings: ["stern", "unadorned", "strictly simple"],
    example: "The professor's austere office contained only a desk and two chairs.",
    translation: "教授朴素的办公室里只有一张桌子和两把椅子。",
    synonyms: ["severe", "stark", "ascetic"],
    antonyms: ["ornate", "luxurious", "lavish"],
    roots: ["auster: harsh"],
    visualKeyword: "empty room",
    visualScene:
      "A bare room with one wooden chair, no decorations, and a quiet gray window.",
    imagePrompt:
      "austere empty room, one chair, soft daylight, low stimulation visual style",
    memoryHookCn: "austere 看成 all-stare：空到大家只能盯着墙看，朴素又严厉。",
    difficultyLevel: 3,
    frequencyTag: "high",
    categoryTags: ["abstract", "style"],
    confusingWith: "ornate",
  },
  {
    id: "prodigal",
    word: "prodigal",
    phonetic: "/'prɑːdɪɡəl/",
    coreMeaningCn: "挥霍的，浪费的",
    coreMeaningEn: "recklessly wasteful or extravagant",
    greMeanings: ["lavish", "wasteful", "extravagant"],
    example: "His prodigal spending quickly exhausted the grant.",
    translation: "他挥霍式的花费很快耗尽了这笔资助。",
    synonyms: ["extravagant", "lavish", "wasteful"],
    antonyms: ["frugal", "thrifty", "prudent"],
    visualKeyword: "coins waterfall",
    visualScene:
      "A wallet pours coins like a waterfall while a small timer keeps ticking.",
    imagePrompt:
      "wallet pouring coins like a waterfall, calm colorful vector illustration",
    memoryHookCn: "prodigal 像 project + gold，把金币当项目乱扔，就是挥霍。",
    difficultyLevel: 3,
    frequencyTag: "medium",
    categoryTags: ["finance", "behavior"],
    confusingWith: "frugal",
  },
  {
    id: "enervate",
    word: "enervate",
    phonetic: "/'enərveɪt/",
    coreMeaningCn: "削弱，使无力",
    coreMeaningEn: "to drain energy or vitality",
    greMeanings: ["weaken", "debilitate", "sap"],
    example: "The humid afternoon seemed to enervate the entire team.",
    translation: "潮湿的下午似乎让整个团队都没了力气。",
    synonyms: ["debilitate", "weaken", "sap"],
    antonyms: ["energize", "strengthen", "invigorate"],
    roots: ["nerv: sinew, strength"],
    visualKeyword: "empty battery",
    visualScene:
      "A bright battery slowly fades to pale gray while a runner sits down gently.",
    imagePrompt:
      "soft illustration of a battery losing power beside a tired runner",
    memoryHookCn: "enervate 里有 nerve，神经被抽空，整个人就无力了。",
    difficultyLevel: 4,
    frequencyTag: "high",
    categoryTags: ["body", "abstract"],
    confusingWith: "energize",
  },
  {
    id: "obdurate",
    word: "obdurate",
    phonetic: "/'ɑːbdərət/",
    coreMeaningCn: "顽固的，执拗的",
    coreMeaningEn: "stubbornly refusing to change",
    greMeanings: ["unyielding", "stubborn", "inflexible"],
    example: "The negotiator remained obdurate despite the new evidence.",
    translation: "即使有新证据，谈判者仍然顽固不改。",
    synonyms: ["inflexible", "adamant", "stubborn"],
    antonyms: ["yielding", "pliable", "flexible"],
    roots: ["dur: hard"],
    visualKeyword: "stone door",
    visualScene:
      "A stone door refuses to open while gentle keys bounce off its surface.",
    imagePrompt:
      "stone door with soft keys bouncing away, calm low contrast illustration",
    memoryHookCn: "dur 表示硬，obdurate 就像一扇硬石门，怎么劝都不开。",
    difficultyLevel: 4,
    frequencyTag: "high",
    categoryTags: ["personality", "abstract"],
    confusingWith: "pliable",
  },
  {
    id: "ephemeral",
    word: "ephemeral",
    phonetic: "/ɪ'femərəl/",
    coreMeaningCn: "短暂的，转瞬即逝的",
    coreMeaningEn: "lasting for a very short time",
    greMeanings: ["transient", "fleeting", "short-lived"],
    example: "The app's popularity proved ephemeral.",
    translation: "这个应用的人气被证明是短暂的。",
    synonyms: ["fleeting", "transient", "evanescent"],
    antonyms: ["permanent", "enduring", "lasting"],
    roots: ["hemer: day"],
    visualKeyword: "soap bubble",
    visualScene:
      "A soap bubble reflects a whole city for one second before it disappears.",
    imagePrompt:
      "soap bubble with tiny city reflection, soft daylight, fleeting moment",
    memoryHookCn: "ephemeral 像一封 email 烟花，看见一下就消失。",
    difficultyLevel: 3,
    frequencyTag: "high",
    categoryTags: ["time", "abstract"],
    confusingWith: "enduring",
  },
  {
    id: "garrulous",
    word: "garrulous",
    phonetic: "/'ɡaerələs/",
    coreMeaningCn: "话多的，喋喋不休的",
    coreMeaningEn: "excessively talkative",
    greMeanings: ["loquacious", "talkative", "wordy"],
    example: "The garrulous host turned a short toast into a long lecture.",
    translation: "话多的主持人把简短祝酒词说成了长篇演讲。",
    synonyms: ["loquacious", "verbose", "chatty"],
    antonyms: ["laconic", "reserved", "terse"],
    visualKeyword: "word waterfall",
    visualScene:
      "Words pour from a smiling speaker like a waterfall into a small teacup.",
    imagePrompt:
      "person speaking a waterfall of words into a teacup, friendly illustration",
    memoryHookCn: "garrulous 像咕噜咕噜，话一直冒出来。",
    difficultyLevel: 3,
    frequencyTag: "medium",
    categoryTags: ["personality", "speech"],
    confusingWith: "laconic",
  },
  {
    id: "ameliorate",
    word: "ameliorate",
    phonetic: "/ə'miːliəreɪt/",
    coreMeaningCn: "改善，使变好",
    coreMeaningEn: "to make something better",
    greMeanings: ["improve", "mitigate", "upgrade"],
    example: "The new policy was designed to ameliorate overcrowding.",
    translation: "新政策旨在改善过度拥挤的问题。",
    synonyms: ["improve", "better", "mitigate"],
    antonyms: ["worsen", "aggravate", "exacerbate"],
    roots: ["melior: better"],
    visualKeyword: "repairing ladder",
    visualScene:
      "A ladder repairs itself step by step, letting someone climb out of a pit.",
    imagePrompt:
      "ladder repairing itself above a soft green pit, hopeful clean illustration",
    memoryHookCn: "melior 表示 better，ameliorate 就是让情况 better。",
    difficultyLevel: 4,
    frequencyTag: "high",
    categoryTags: ["academic", "change"],
    confusingWith: "exacerbate",
  },
  {
    id: "esoteric",
    word: "esoteric",
    phonetic: "/ˌesə'terɪk/",
    coreMeaningCn: "深奥的，只有少数人懂的",
    coreMeaningEn: "understood by only a small group",
    greMeanings: ["obscure", "specialized", "arcane"],
    example: "The paper relied on esoteric terminology.",
    translation: "这篇论文使用了深奥的专业术语。",
    synonyms: ["arcane", "obscure", "abstruse"],
    antonyms: ["common", "accessible", "plain"],
    roots: ["eso: within"],
    visualKeyword: "locked tiny library",
    visualScene:
      "A small library inside a glass box has a key held by only three readers.",
    imagePrompt:
      "tiny locked library in a glass box, three readers holding keys, calm colors",
    memoryHookCn: "eso 像 inside，知识藏在里面，只有少数人进得去。",
    difficultyLevel: 4,
    frequencyTag: "high",
    categoryTags: ["academic", "abstract"],
    confusingWith: "accessible",
  },
  {
    id: "capricious",
    word: "capricious",
    phonetic: "/kə'prɪʃəs/",
    coreMeaningCn: "反复无常的，任性的",
    coreMeaningEn: "changing suddenly and unpredictably",
    greMeanings: ["fickle", "whimsical", "inconstant"],
    example: "The director's capricious decisions made planning impossible.",
    translation: "主管反复无常的决定让计划无法推进。",
    synonyms: ["fickle", "volatile", "whimsical"],
    antonyms: ["steady", "predictable", "consistent"],
    visualKeyword: "weather hat",
    visualScene:
      "A hat changes from sun to rain to snow while sitting on one person's head.",
    imagePrompt:
      "hat changing weather symbols quickly, soft editorial illustration",
    memoryHookCn: "capricious 像 cap 一直换，帽子天气不断变，反复无常。",
    difficultyLevel: 3,
    frequencyTag: "high",
    categoryTags: ["personality", "change"],
    confusingWith: "consistent",
  },
  {
    id: "mollify",
    word: "mollify",
    phonetic: "/'mɑːlɪfaɪ/",
    coreMeaningCn: "安抚，缓和",
    coreMeaningEn: "to soothe anger or reduce intensity",
    greMeanings: ["appease", "pacify", "soften"],
    example: "A sincere apology helped mollify the upset client.",
    translation: "真诚的道歉帮助安抚了不满的客户。",
    synonyms: ["appease", "soothe", "pacify"],
    antonyms: ["provoke", "agitate", "inflame"],
    roots: ["moll: soft"],
    visualKeyword: "soft blanket",
    visualScene:
      "A sharp red alarm is wrapped in a soft green blanket and becomes quiet.",
    imagePrompt:
      "red alarm wrapped in soft green blanket, calming vector illustration",
    memoryHookCn: "moll 表示 soft，把怒气变 soft，就是安抚。",
    difficultyLevel: 3,
    frequencyTag: "medium",
    categoryTags: ["emotion", "action"],
    confusingWith: "agitate",
  },
];

export function getInitialMemory(words: Word[] = seedWords): UserWordMemory[] {
  return words.map((word) => ({
    wordId: word.id,
    status: "new",
    easeFactor: 2.5,
    intervalDays: 0,
    repetitionCount: 0,
    correctCount: 0,
    wrongCount: 0,
  }));
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function calculateNextReview(rating: Rating, from = new Date()) {
  if (rating === "forgot") return addMinutes(from, 10);
  if (rating === "hard") return addDays(from, 1);
  if (rating === "good") return addDays(from, 3);
  return addDays(from, 7);
}

export function updateWordMemory(
  memory: UserWordMemory,
  rating: Rating,
  now = new Date(),
): UserWordMemory {
  const nextReview = calculateNextReview(rating, now);
  const wrongCount = memory.wrongCount + (rating === "forgot" ? 1 : 0);
  const correctCount = memory.correctCount + (rating !== "forgot" ? 1 : 0);
  const repetitionCount = memory.repetitionCount + 1;

  let intervalDays = memory.intervalDays;
  let status: MemoryStatus = memory.status;

  if (rating === "forgot") {
    intervalDays = 0;
    status = wrongCount >= 2 ? "at_risk" : "learning";
  }

  if (rating === "hard") {
    intervalDays = 1;
    status = wrongCount >= 2 ? "at_risk" : "reviewing";
  }

  if (rating === "good") {
    intervalDays = Math.max(3, Math.round(memory.intervalDays * 2));
    status = "reviewing";
  }

  if (rating === "easy") {
    intervalDays = Math.max(7, Math.round(memory.intervalDays * 2.5));
    status = repetitionCount >= 4 ? "mastered" : "reviewing";
  }

  return {
    ...memory,
    status,
    intervalDays,
    repetitionCount,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: nextReview.toISOString(),
    correctCount,
    wrongCount,
    lastRating: rating,
  };
}

export function isDue(memory: UserWordMemory, now = new Date()) {
  if (!memory.nextReviewAt) return false;
  return new Date(memory.nextReviewAt).getTime() <= now.getTime();
}

export function isWeak(memory: UserWordMemory) {
  return memory.manualWeak || memory.status === "at_risk" || memory.wrongCount >= 2;
}

export function normalizeImportedWord(raw: Record<string, unknown>, index: number): Word {
  const get = (key: string, fallback = "") =>
    String(raw[key] ?? raw[toSnake(key)] ?? raw[toKebab(key)] ?? fallback).trim();

  const word = get("word", `word-${index + 1}`);
  const id = get("id", word.toLowerCase().replace(/[^a-z0-9]+/g, "-"));

  return {
    id,
    word,
    phonetic: get("phonetic") || get("phonetic_us"),
    coreMeaningCn: get("coreMeaningCn") || get("core_meaning_cn", "待补充中文释义"),
    coreMeaningEn: get("coreMeaningEn") || get("core_meaning_en", "meaning pending"),
    greMeanings: splitList(raw.greMeanings ?? raw.gre_meanings),
    example: get("example") || get("example_sentence", "Example sentence pending."),
    translation: get("translation") || get("example_translation_cn", "待补充例句翻译"),
    synonyms: splitList(raw.synonyms),
    antonyms: splitList(raw.antonyms),
    roots: splitList(raw.roots),
    affixes: splitList(raw.affixes),
    visualKeyword: get("visualKeyword") || get("visual_keyword", word),
    visualScene:
      get("visualScene") ||
      get("visual_scene", `把 ${word} 变成一个夸张、清晰、容易回想的画面。`),
    imagePrompt:
      get("imagePrompt") ||
      get("image_prompt", `calm memory illustration for GRE word ${word}`),
    imageUrl: get("imageUrl") || get("image_url"),
    memoryHookCn:
      get("memoryHookCn") ||
      get("memory_hook_cn", `为 ${word} 添加一个中文视觉记忆钩子。`),
    difficultyLevel: clampDifficulty(Number(raw.difficultyLevel ?? raw.difficulty_level ?? 3)),
    frequencyTag: normalizeFrequency(raw.frequencyTag ?? raw.frequency_tag),
    categoryTags: splitList(raw.categoryTags ?? raw.category_tags),
    confusingWith: get("confusingWith") || get("confusing_with"),
  };
}

export function parseCsv(text: string): Record<string, unknown>[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce<Record<string, unknown>>((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  });
}

function splitCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function splitList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[|;，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toSnake(key: string) {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toKebab(key: string) {
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function clampDifficulty(value: number): 1 | 2 | 3 | 4 | 5 {
  return Math.min(5, Math.max(1, Number.isFinite(value) ? value : 3)) as
    | 1
    | 2
    | 3
    | 4
    | 5;
}

function normalizeFrequency(value: unknown): FrequencyTag {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
}
