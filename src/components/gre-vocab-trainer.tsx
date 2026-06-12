"use client";

import {
  Brain,
  Check,
  ChevronRight,
  Eye,
  FileUp,
  Focus,
  Grid3X3,
  HeartPulse,
  Home,
  Leaf,
  ListChecks,
  Moon,
  Play,
  Smile,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Sun,
  Target,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { DragEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  defaultSettings,
  getWordAssetImage,
  getInitialMemory,
  isDue,
  isWeak,
  normalizeImportedWord,
  parseCsv,
  seedWords,
  type MemoryStatus,
  type Rating,
  type TrainerSettings,
  type QuizBlank,
  type UserWordMemory,
  type Word,
  updateWordMemory,
} from "@/lib/gre-vocab";

type TrainerPage =
  | "dashboard"
  | "session"
  | "focus"
  | "review"
  | "visual"
  | "quiz"
  | "weak"
  | "word-map"
  | "roots"
  | "settings"
  | "profile"
  | "import"
  | "word";

type GreVocabTrainerProps = {
  page?: TrainerPage;
  wordId?: string;
};

type StoreState = {
  words: Word[];
  memories: UserWordMemory[];
  settings: TrainerSettings;
  notes: Record<string, string>;
  profile: UserProfile;
  milestones: Record<string, boolean>;
  generatedImages: Record<string, string>;
  quizExplanations?: Record<string, string>;
  pinnedWords?: Record<string, number>;
  questionMistakes?: Record<string, QuestionMistake>;
  quizResults?: Record<string, QuizResult>;
  progress?: TrainerProgress;
  datasetVersion?: string;
};

const STORE_KEY = "gre-visual-memory-trainer";
const DATASET_VERSION = "gre-3599-fill-reading-photos-2026-v7";

type UserProfile = {
  name: string;
  emoji: string;
  goalLabel: string;
};

type QuestionMistake = {
  id: string;
  kind: "fill" | "reading";
  title: string;
  prompt: string;
  answer: string;
  wrongCount: number;
  lastWrongAt: string;
};

type QuizResult = {
  status: "correct" | "wrong";
  answeredAt: string;
};

type TrainerProgress = {
  sessionIndex?: number;
  focusIndex?: number;
  quizIndex?: number;
  quizMode?: "fill" | "reading";
  readingIndex?: number;
  visualWordId?: string;
};

const defaultProfile: UserProfile = {
  name: "GRE Learner",
  emoji: "🌱",
  goalLabel: "每天 300 词，分轮完成",
};

const ratingMeta: Record<
  Rating,
  { label: string; note: string; className: string }
> = {
  forgot: {
    label: "完全不记得",
    note: "10 分钟后再见",
    className: "border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100",
  },
  hard: {
    label: "有点眼熟",
    note: "明天复习",
    className: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
  },
  good: {
    label: "基本记得",
    note: "3 天后复习",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
  },
  easy: {
    label: "非常熟",
    note: "7 天后复习",
    className: "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100",
  },
};

const statusLabel: Record<MemoryStatus, string> = {
  new: "新词",
  learning: "学习中",
  reviewing: "复习中",
  at_risk: "快忘了",
  mastered: "已掌握",
};

const statusColor: Record<MemoryStatus, string> = {
  new: "bg-slate-200 text-slate-700",
  learning: "bg-sky-200 text-sky-950",
  reviewing: "bg-amber-200 text-amber-950",
  at_risk: "bg-orange-200 text-orange-950",
  mastered: "bg-emerald-200 text-emerald-950",
};

const navItems = [
  { href: "/", label: "今天", icon: Home },
  { href: "/session", label: "学习", icon: Play },
  { href: "/focus", label: "专注", icon: Focus },
  { href: "/review", label: "复习", icon: RotateCcw },
  { href: "/visual", label: "视觉", icon: Eye },
  { href: "/quiz", label: "测试", icon: ListChecks },
  { href: "/weak-words", label: "错词", icon: HeartPulse },
  { href: "/word-map", label: "地图", icon: Grid3X3 },
  { href: "/roots", label: "词根", icon: Leaf },
  { href: "/profile", label: "用户", icon: Smile },
  { href: "/admin/import", label: "导入", icon: FileUp },
  { href: "/settings", label: "设置", icon: Settings },
];

export function GreVocabTrainer({
  page = "dashboard",
  wordId,
}: GreVocabTrainerProps) {
  const store = useTrainerStore();
  const derived = useDerivedTrainerData(store);
  const [celebration, setCelebration] = useState<null | number>(null);

  useEffect(() => {
    const milestone = Math.floor(derived.completedToday / 100) * 100;
    if (milestone < 100) return;

    const key = `${new Date().toDateString()}-${milestone}`;
    if (store.milestones[key]) return;

    setCelebration(milestone);
    store.markMilestone(key);
  }, [derived.completedToday, store]);

  if (page === "focus") {
    return (
      <FocusPage
        store={store}
        words={derived.sessionWords}
        completedToday={derived.completedToday}
      />
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen bg-[#f7f6f1] text-slate-950 transition-colors",
        store.settings.darkMode && "gre-dark bg-stone-950 text-stone-50",
      )}
    >
      <TrainerShell page={page} store={store} derived={derived}>
        {celebration && (
          <CelebrationOverlay
            count={celebration}
            onClose={() => setCelebration(null)}
          />
        )}
        {page === "dashboard" && (
          <DashboardPage store={store} derived={derived} />
        )}
        {page === "session" && (
          <SessionPage store={store} words={derived.sessionWords} />
        )}
        {page === "review" && (
          <ReviewPage store={store} words={derived.dueReviewWords} />
        )}
        {page === "visual" && <VisualPage store={store} />}
        {page === "quiz" && <QuizPage store={store} />}
        {page === "weak" && <WeakWordsPage store={store} />}
        {page === "word-map" && <WordMapPage store={store} />}
        {page === "roots" && <RootsPage store={store} />}
        {page === "settings" && <SettingsPage store={store} />}
        {page === "profile" && (
          <ProfilePage store={store} derived={derived} />
        )}
        {page === "import" && <ImportPage store={store} />}
        {page === "word" && <WordDetailPage store={store} wordId={wordId} />}
      </TrainerShell>
    </div>
  );
}

function useTrainerStore() {
  const [words, setWords] = useState<Word[]>(seedWords);
  const [memories, setMemories] = useState<UserWordMemory[]>(
    getInitialMemory(seedWords),
  );
  const [settings, setSettings] = useState<TrainerSettings>(defaultSettings);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [milestones, setMilestones] = useState<Record<string, boolean>>({});
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [imageStatus, setImageStatus] = useState<Record<string, string>>({});
  const [quizExplanations, setQuizExplanations] = useState<Record<string, string>>({});
  const [pinnedWords, setPinnedWords] = useState<Record<string, number>>({});
  const [questionMistakes, setQuestionMistakes] = useState<Record<string, QuestionMistake>>({});
  const [quizResults, setQuizResults] = useState<Record<string, QuizResult>>({});
  const [progress, setProgress] = useState<TrainerProgress>({});
  const [datasetVersion, setDatasetVersion] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<StoreState>;
        if (parsed.words?.length) setWords(parsed.words);
        if (parsed.memories?.length) setMemories(parsed.memories);
        if (parsed.settings) {
          setSettings({ ...defaultSettings, ...parsed.settings });
        }
        if (parsed.notes) setNotes(parsed.notes);
        if (parsed.profile) setProfile({ ...defaultProfile, ...parsed.profile });
        if (parsed.milestones) setMilestones(parsed.milestones);
        if (parsed.generatedImages) setGeneratedImages(parsed.generatedImages);
        if (parsed.quizExplanations) setQuizExplanations(parsed.quizExplanations);
        if (parsed.pinnedWords) setPinnedWords(parsed.pinnedWords);
        if (parsed.questionMistakes) setQuestionMistakes(parsed.questionMistakes);
        if (parsed.quizResults) setQuizResults(parsed.quizResults);
        if (parsed.progress) setProgress(parsed.progress);
        if (parsed.datasetVersion) setDatasetVersion(parsed.datasetVersion);
      } catch {
        window.localStorage.removeItem(STORE_KEY);
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        words,
        memories,
        settings,
        notes,
        profile,
        milestones,
        generatedImages,
        quizExplanations,
        pinnedWords,
        questionMistakes,
        quizResults,
        progress,
        datasetVersion,
      }),
    );
  }, [
    ready,
    words,
    memories,
    settings,
    notes,
    profile,
    milestones,
    generatedImages,
    quizExplanations,
    pinnedWords,
    questionMistakes,
    quizResults,
    progress,
    datasetVersion,
  ]);

  useEffect(() => {
    if (
      !ready ||
      (words.length > seedWords.length && datasetVersion === DATASET_VERSION)
    ) {
      return;
    }

    let cancelled = false;
    fetch("/data/gre-vocab-extracted.local.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((nextWords: Array<Record<string, unknown>> | null) => {
        if (cancelled || !nextWords?.length) return;
        importWords(nextWords.map(normalizeImportedWord));
        setDatasetVersion(DATASET_VERSION);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [datasetVersion, ready, words.length]);

  function rateWord(wordId: string, rating: Rating) {
    setMemories((current) =>
      current.map((memory) =>
        memory.wordId === wordId ? updateWordMemory(memory, rating) : memory,
      ),
    );
  }

  function toggleWeak(wordId: string) {
    setMemories((current) =>
      current.map((memory) =>
        memory.wordId === wordId
          ? { ...memory, manualWeak: !memory.manualWeak }
          : memory,
      ),
    );
  }

  function importWords(nextWords: Word[]) {
    setWords(nextWords);
    setMemories((current) => {
      const byId = new Map(current.map((memory) => [memory.wordId, memory]));
      return nextWords.map(
        (word) =>
          byId.get(word.id) ?? {
            wordId: word.id,
            status: "new",
            easeFactor: 2.5,
            intervalDays: 0,
            repetitionCount: 0,
            correctCount: 0,
            wrongCount: 0,
          },
      );
    });
  }

  function updateNote(wordId: string, note: string) {
    setNotes((current) => ({ ...current, [wordId]: note }));
  }

  function updateProfile(nextProfile: UserProfile) {
    setProfile(nextProfile);
  }

  function updateQuizExplanation(key: string, explanation: string) {
    setQuizExplanations((current) => ({ ...current, [key]: explanation }));
  }

  function updateProgress(nextProgress: Partial<TrainerProgress>) {
    setProgress((current) => {
      const changed = Object.entries(nextProgress).some(
        ([key, value]) =>
          current[key as keyof TrainerProgress] !== value,
      );
      return changed ? { ...current, ...nextProgress } : current;
    });
  }

  function recordQuizResult(id: string, status: QuizResult["status"]) {
    setQuizResults((current) => ({
      ...current,
      [id]: { status, answeredAt: new Date().toISOString() },
    }));
  }

  function togglePinnedWord(wordId: string) {
    setPinnedWords((current) => {
      const next = { ...current };
      if (next[wordId]) {
        delete next[wordId];
      } else {
        next[wordId] = 1;
      }
      return next;
    });
  }

  function incrementPinnedWord(wordId: string) {
    setPinnedWords((current) => ({
      ...current,
      [wordId]: (current[wordId] ?? 0) + 1,
    }));
  }

  function recordQuestionMistake(mistake: Omit<QuestionMistake, "wrongCount" | "lastWrongAt">) {
    setQuestionMistakes((current) => {
      const existing = current[mistake.id];
      return {
        ...current,
        [mistake.id]: {
          ...mistake,
          wrongCount: (existing?.wrongCount ?? 0) + 1,
          lastWrongAt: new Date().toISOString(),
        },
      };
    });
  }

  function clearQuestionMistake(id: string) {
    setQuestionMistakes((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function markMilestone(key: string) {
    setMilestones((current) => ({ ...current, [key]: true }));
  }

  async function generateImage(word: Word) {
    setImageStatus((current) => ({ ...current, [word.id]: "生成中..." }));
    try {
      const response = await fetch("/api/generate-word-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: word.word,
          meaning: word.coreMeaningCn,
          prompt: word.imagePrompt,
          scene: word.visualScene,
        }),
      });
      const result = (await response.json()) as {
        dataUrl?: string;
        error?: string;
      };
      if (!response.ok || !result.dataUrl) {
        throw new Error(result.error ?? "图片生成失败");
      }
      const dataUrl = result.dataUrl;
      setGeneratedImages((current) => ({ ...current, [word.id]: dataUrl }));
      setImageStatus((current) => ({ ...current, [word.id]: "已生成图片" }));
    } catch (error) {
      setImageStatus((current) => ({
        ...current,
        [word.id]:
          error instanceof Error
            ? error.message
            : "图片生成失败，请稍后再试",
      }));
    }
  }

  function resetDemo() {
    setWords(seedWords);
    setMemories(getInitialMemory(seedWords));
    setSettings(defaultSettings);
    setNotes({});
    setProfile(defaultProfile);
    setMilestones({});
    setGeneratedImages({});
    setImageStatus({});
    setQuizExplanations({});
    setPinnedWords({});
    setQuestionMistakes({});
    setQuizResults({});
    setProgress({});
    setDatasetVersion("");
  }

  return {
    words,
    memories,
    settings,
    notes,
    profile,
    milestones,
    generatedImages,
    imageStatus,
    quizExplanations,
    pinnedWords,
    questionMistakes,
    quizResults,
    progress,
    setSettings,
    rateWord,
    toggleWeak,
    importWords,
    updateNote,
    updateProfile,
    updateQuizExplanation,
    updateProgress,
    recordQuizResult,
    togglePinnedWord,
    incrementPinnedWord,
    recordQuestionMistake,
    clearQuestionMistake,
    markMilestone,
    generateImage,
    resetDemo,
  };
}

function useDerivedTrainerData(store: ReturnType<typeof useTrainerStore>) {
  return useMemo(() => {
    const todayKey = new Date().toDateString();
    const memoryByWord = new Map(
      store.memories.map((memory) => [memory.wordId, memory]),
    );
    const completedToday = store.memories.filter(
      (memory) =>
        memory.lastReviewedAt &&
        new Date(memory.lastReviewedAt).toDateString() === todayKey,
    ).length;
    const dueReviewWords = store.words.filter((word) =>
      isDue(memoryByWord.get(word.id) ?? fallbackMemory(word.id)),
    );
    const newWords = store.words.filter(
      (word) => (memoryByWord.get(word.id)?.status ?? "new") === "new",
    );
    const sessionWords = [...dueReviewWords, ...newWords].slice(
      0,
      store.settings.sessionSize,
    );
    const weakWords = store.words.filter((word) =>
      isWeak(memoryByWord.get(word.id) ?? fallbackMemory(word.id)),
    );

    return {
      memoryByWord,
      completedToday,
      dueReviewWords,
      newWords,
      sessionWords,
      weakWords,
      progress: Math.min(
        100,
        Math.round((completedToday / store.settings.dailyTarget) * 100),
      ),
      remainingToday: Math.max(0, store.settings.dailyTarget - completedToday),
      roundsRemaining: Math.ceil(
        Math.max(0, store.settings.dailyTarget - completedToday) /
          store.settings.sessionSize,
      ),
      masteredCount: store.memories.filter(
        (memory) => memory.status === "mastered",
      ).length,
      atRiskCount: store.memories.filter(
        (memory) => memory.status === "at_risk" || memory.wrongCount >= 2,
      ).length,
    };
  }, [store]);
}

function TrainerShell({
  page,
  store,
  derived,
  children,
}: {
  page: TrainerPage;
  store: ReturnType<typeof useTrainerStore>;
  derived: ReturnType<typeof useDerivedTrainerData>;
  children: ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#f7f6f1]/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white shadow-sm">
              <Brain className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-lg font-semibold">
                GRE 图像记忆单词系统
              </span>
              <span className="block truncate text-sm text-slate-500">
                少量输入 · 图像绑定 · 间隔复习
              </span>
            </span>
          </Link>
          <div className="hidden items-center gap-3 md:flex">
            <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
              今日 {derived.completedToday}/{store.settings.dailyTarget}
            </Badge>
            <Button
              size="icon"
              variant="outline"
              className="h-10 w-10 rounded-md"
              onClick={() =>
                store.setSettings((current) => ({
                  ...current,
                  darkMode: !current.darkMode,
                }))
              }
              title={store.settings.darkMode ? "切换浅色模式" : "切换深色模式"}
            >
              {store.settings.darkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button asChild size="sm" className="gap-2">
              <Link href="/session">
                <Play className="h-4 w-4" />
                Start Today
              </Link>
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 pb-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              (page === "dashboard" && item.href === "/") ||
              item.href.includes(page) ||
              (page === "weak" && item.href === "/weak-words") ||
              (page === "import" && item.href === "/admin/import");
            return (
              <Button
                asChild
                key={item.href}
                variant={active ? "default" : "ghost"}
                size="sm"
                className="h-11 shrink-0 gap-2 rounded-md px-3 text-sm font-medium"
              >
                <Link href={item.href}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 md:py-8">{children}</main>
    </>
  );
}

function DashboardPage({
  store,
  derived,
}: {
  store: ReturnType<typeof useTrainerStore>;
  derived: ReturnType<typeof useDerivedTrainerData>;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge className="mb-4 bg-sky-100 text-sky-950 hover:bg-sky-100">
              今天只要完成一点点就很好
            </Badge>
            <h1 className="max-w-2xl text-3xl font-semibold tracking-normal md:text-5xl">
              今日目标{" "}
              <span className="whitespace-nowrap">
                {store.settings.dailyTarget} 词
              </span>
              ，拆成{" "}
              <span className="whitespace-nowrap">
                {store.settings.sessionSize} 词
              </span>
              一轮。
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              不一次性硬背 200-500 个词。每轮只处理一个小块，完成后系统自动安排复习。
            </p>
          </div>
          <div className="w-full max-w-sm rounded-md border border-slate-200 bg-[#f7f6f1] p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium">今日进度</span>
              <span className="text-slate-500">{derived.progress}%</span>
            </div>
            <Progress value={derived.progress} />
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Metric label="已完成" value={`${derived.completedToday} 词`} />
              <Metric label="剩余轮数" value={`${derived.roundsRemaining} 轮`} />
              <Metric label="需复习" value={`${derived.dueReviewWords.length} 词`} />
              <Metric label="错词" value={`${derived.atRiskCount} 词`} />
            </div>
          </div>
        </div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 gap-2">
            <Link href="/session">
              <Play className="h-4 w-4" />
              开始今天学习
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 gap-2">
            <Link href="/focus">
              <Focus className="h-4 w-4" />
              进入专注模式
            </Link>
          </Button>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle
          icon={Target}
          title="今天任务"
          subtitle="按你的高强度目标设计，但保持低分心。"
        />
        <div className="mt-5 space-y-3">
          <TaskRow label="每日目标" value={`${store.settings.dailyTarget} 词`} />
          <TaskRow label="每轮学习" value={`${store.settings.sessionSize} 词`} />
          <TaskRow
            label="预计还需"
            value={`${derived.roundsRemaining} 轮小任务`}
          />
          <TaskRow
            label="当前词库"
            value={`${store.words.length} 词，可从导入页扩展`}
          />
        </div>
        <Separator className="my-5" />
        <p className="text-sm leading-6 text-slate-600">
          忘记不是失败，是系统提醒你该复习了。先完成一轮，再决定要不要继续下一轮。
        </p>
      </section>

      <DashboardPanel
        icon={Eye}
        title="视觉记忆"
        href="/visual"
        text="把抽象词变成场景、颜色和荒诞联想。"
      />
      <DashboardPanel
        icon={HeartPulse}
        title="错词急救"
        href="/weak-words"
        text="连续忘记的词会进入急救区，强化图像钩子和易混词对比。"
      />
      <DashboardPanel
        icon={Grid3X3}
        title="单词地图"
        href="/word-map"
        text="用颜色快速看见哪些词未学、复习中、快忘了或已掌握。"
      />
      <DashboardPanel
        icon={FileUp}
        title="导入词库"
        href="/admin/import"
        text="支持 CSV/JSON，把你合法获得的 GRE 3000 词库导入进来。"
      />
    </div>
  );
}

function SessionPage({
  store,
  words,
}: {
  store: ReturnType<typeof useTrainerStore>;
  words: Word[];
}) {
  return (
    <LearningSession
      title="今日学习"
      subtitle="一轮只处理少量词。先回忆，再看完整答案。"
      words={words}
      store={store}
    />
  );
}

function ReviewPage({
  store,
  words,
}: {
  store: ReturnType<typeof useTrainerStore>;
  words: Word[];
}) {
  if (words.length === 0) {
    return (
      <EmptyState
        icon={RotateCcw}
        title="现在没有到期复习"
        text="可以继续学习新词，或去错词急救区处理高风险词。"
        actionHref="/session"
        actionText="学习新词"
      />
    );
  }

  return (
    <LearningSession
      title="今日复习"
      subtitle="这些词已经到复习时间。答完后会重新计算下次复习。"
      words={words}
      store={store}
    />
  );
}

function LearningSession({
  title,
  subtitle,
  words,
  store,
}: {
  title: string;
  subtitle: string;
  words: Word[];
  store: ReturnType<typeof useTrainerStore>;
}) {
  const [index, setIndex] = useState(0);
  const [roundWords, setRoundWords] = useState<Word[]>(words);
  const word = roundWords[index];

  useEffect(() => {
    const savedIndex = store.progress.sessionIndex ?? 0;
    if (savedIndex > 0 && savedIndex < roundWords.length) {
      setIndex(savedIndex);
    }
  }, [roundWords.length, store.progress.sessionIndex]);

  useEffect(() => {
    store.updateProgress({ sessionIndex: index });
  }, [index, store]);

  useEffect(() => {
    if (roundWords.length === 0 && words.length > 0) {
      setRoundWords(words);
      setIndex(0);
      store.updateProgress({ sessionIndex: 0 });
    }
  }, [roundWords.length, words]);

  if (!word) {
    return (
      <section className="mx-auto max-w-lg rounded-md border border-slate-200 bg-white p-7 text-center shadow-sm">
        <Check className="mx-auto h-10 w-10 text-emerald-700" />
        <h1 className="mt-5 text-2xl font-semibold">这一组完成了</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          当前组的词已经写入复习计划。点击下面按钮会读取最新状态，开始下一组。
        </p>
        <Button
          className="mt-6"
          onClick={() => {
            setRoundWords(words);
            setIndex(0);
            store.updateProgress({ sessionIndex: 0 });
          }}
          disabled={words.length === 0}
        >
          刷新下一组
        </Button>
      </section>
    );
  }

  function handleRate(rating: Rating) {
    store.rateWord(word.id, rating);
    if (rating === "forgot") store.incrementPinnedWord(word.id);
    setIndex((current) => current + 1);
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold md:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
          <span className="text-sm font-medium">
            进度 {index + 1} / {roundWords.length}
          </span>
          <Progress
            value={Math.round(((index + 1) / roundWords.length) * 100)}
            className="mt-2 w-44"
          />
        </div>
      </div>

      <RecallSteps active={4} />

      <div className="mt-5">
        <WordCard
          word={word}
          memory={
            store.memories.find((memory) => memory.wordId === word.id) ??
            fallbackMemory(word.id)
          }
          note={store.notes[word.id] ?? ""}
          imageSrc={store.generatedImages[word.id] ?? word.imageUrl ?? getWordAssetImage(word)}
          imageStatus={store.imageStatus[word.id]}
          pinnedCount={store.pinnedWords[word.id] ?? 0}
          onRate={handleRate}
          onNoteChange={(note) => store.updateNote(word.id, note)}
          onTogglePin={() => store.togglePinnedWord(word.id)}
          onGenerateImage={() => store.generateImage(word)}
        />
      </div>
      <SessionNav
        canBack={index > 0}
        canNext={index < roundWords.length - 1}
        onBack={() => setIndex((current) => Math.max(0, current - 1))}
        onNext={() =>
          setIndex((current) => Math.min(roundWords.length - 1, current + 1))
        }
      />
    </section>
  );
}

function FocusPage({
  store,
  words,
  completedToday,
}: {
  store: ReturnType<typeof useTrainerStore>;
  words: Word[];
  completedToday: number;
}) {
  const [index, setIndex] = useState(0);
  const [focusWords, setFocusWords] = useState<Word[]>(words);
  const [awayMessage, setAwayMessage] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const word = focusWords[index];

  useEffect(() => {
    const savedIndex = store.progress.focusIndex ?? 0;
    if (savedIndex > 0 && savedIndex < focusWords.length) {
      setIndex(savedIndex);
    }
  }, [focusWords.length, store.progress.focusIndex]);

  useEffect(() => {
    store.updateProgress({ focusIndex: index });
  }, [index, store]);

  useEffect(() => {
    if (focusWords.length === 0 && words.length > 0) {
      setFocusWords(words);
      setIndex(0);
      store.updateProgress({ focusIndex: 0 });
    }
  }, [focusWords.length, words]);

  useEffect(() => {
    const interval = window.setInterval(() => setElapsed((time) => time + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let hiddenAt = 0;
    function onVisibilityChange() {
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt && Date.now() - hiddenAt > 10000) {
        setAwayMessage(true);
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const breakDue = store.settings.breakReminder && elapsed >= 7 * 60;

  function handleRate(rating: Rating) {
    if (!word) return;
    store.rateWord(word.id, rating);
    if (rating === "forgot") store.incrementPinnedWord(word.id);
    setIndex((current) => current + 1);
  }

  if (breakDue || index >= focusWords.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f1] px-4">
        <section className="max-w-lg rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Leaf className="mx-auto h-10 w-10 text-emerald-700" />
          <h1 className="mt-5 text-2xl font-semibold">
            你刚刚完成了 {Math.min(index, focusWords.length)} 个词。
          </h1>
          <p className="mt-3 text-slate-600">
            站起来，喝口水。30 秒后继续下一轮也可以。
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button
              onClick={() => {
                setFocusWords(words);
                setIndex(0);
                store.updateProgress({ focusIndex: 0 });
                setElapsed(0);
              }}
              disabled={words.length === 0}
            >
              继续下一组
            </Button>
            <Button asChild variant="outline">
              <Link href="/">回到今天</Link>
            </Button>
          </div>
        </section>
      </div>
    );
  }

  if (!word) {
    return (
      <EmptyState
        icon={Focus}
        title="没有可学习词"
        text="先导入更多 GRE 词库，或等待复习到期。"
        actionHref="/admin/import"
        actionText="导入词库"
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f6f1]">
      <header className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-medium text-slate-600">
          退出专注
        </Link>
        <div className="w-52">
          <div className="mb-1 flex justify-between gap-3 text-xs text-slate-500">
            <span>进度 {index + 1}/{focusWords.length}</span>
            <span>今日 {completedToday}</span>
          </div>
          <Progress value={Math.round(((index + 1) / focusWords.length) * 100)} />
        </div>
      </header>
      {awayMessage && (
        <div className="mx-auto mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-950">
          没关系，我们继续刚才这个词。
        </div>
      )}
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl">
          <WordCard
            word={word}
            memory={
              store.memories.find((memory) => memory.wordId === word.id) ??
              fallbackMemory(word.id)
            }
            note={store.notes[word.id] ?? ""}
            imageSrc={store.generatedImages[word.id] ?? word.imageUrl ?? getWordAssetImage(word)}
            imageStatus={store.imageStatus[word.id]}
            pinnedCount={store.pinnedWords[word.id] ?? 0}
            onRate={handleRate}
            onNoteChange={(note) => store.updateNote(word.id, note)}
            onTogglePin={() => store.togglePinnedWord(word.id)}
            onGenerateImage={() => store.generateImage(word)}
            compact
          />
          <SessionNav
            canBack={index > 0}
            canNext={index < words.length - 1}
            onBack={() => setIndex((current) => Math.max(0, current - 1))}
            onNext={() =>
              setIndex((current) => Math.min(words.length - 1, current + 1))
            }
          />
        </div>
      </main>
    </div>
  );
}

function VisualPage({ store }: { store: ReturnType<typeof useTrainerStore> }) {
  const [selectedId, setSelectedId] = useState(
    store.progress.visualWordId ?? store.words[0]?.id,
  );
  const selected = store.words.find((word) => word.id === selectedId) ?? store.words[0];

  useEffect(() => {
    const requestedWordId =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("word") ?? undefined
        : undefined;
    if (requestedWordId && store.words.some((word) => word.id === requestedWordId)) {
      setSelectedId(requestedWordId);
      store.updateProgress({ visualWordId: requestedWordId });
    } else if (store.progress.visualWordId) {
      setSelectedId(store.progress.visualWordId);
    }
  }, [store.progress.visualWordId, store.words]);

  if (!selected) {
    return (
      <EmptyState
        icon={Eye}
        title="还没有词库"
        text="导入词库后，视觉记忆卡会出现在这里。"
        actionHref="/admin/import"
        actionText="导入词库"
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="rounded-md border border-slate-200 bg-white p-4">
        <SectionTitle icon={Search} title="选择单词" subtitle="点击查看视觉卡" />
        <div className="mt-4 max-h-[680px] space-y-2 overflow-auto pr-1">
          {store.words.map((word) => (
            <button
              className={cn(
                "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition",
                selected.id === word.id
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white hover:bg-slate-50",
              )}
              key={word.id}
              onClick={() => {
                setSelectedId(word.id);
                store.updateProgress({ visualWordId: word.id });
              }}
            >
              <span>{word.word}</span>
              {(store.pinnedWords[word.id] ?? 0) > 0 && (
                <span className="ml-auto mr-2 text-xs">
                  📌
                  {store.pinnedWords[word.id] > 1
                    ? `×${store.pinnedWords[word.id]}`
                    : ""}
                </span>
              )}
              <ChevronRight className="h-4 w-4" />
            </button>
          ))}
        </div>
      </aside>
      <VisualMemoryCard
        word={selected}
        imageSrc={store.generatedImages[selected.id] ?? selected.imageUrl ?? getWordAssetImage(selected)}
        imageStatus={store.imageStatus[selected.id]}
        pinnedCount={store.pinnedWords[selected.id] ?? 0}
        onTogglePin={() => store.togglePinnedWord(selected.id)}
        onGenerateImage={() => store.generateImage(selected)}
      />
    </div>
  );
}

function QuizPage({ store }: { store: ReturnType<typeof useTrainerStore> }) {
  const [index, setIndex] = useState(store.progress.quizIndex ?? 0);
  const [placements, setPlacements] = useState<Record<string, string[]>>({});
  const [dragChoice, setDragChoice] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [quizMode, setQuizMode] = useState<"fill" | "reading">(
    store.progress.quizMode === "reading" ? "reading" : "fill",
  );
  const [modeRestored, setModeRestored] = useState(false);
  const [explanationStatus, setExplanationStatus] = useState("");
  const quizItems = useMemo(() => buildQuizItems(store.words), [store.words]);
  const quizItem = quizItems[index % Math.max(1, quizItems.length)];
  const word = quizItem?.word;
  const question = quizItem?.question;
  const blanks = useMemo(
    () => (quizItem ? buildQuizBlanks(quizItem.word, store.words) : []),
    [quizItem, store.words],
  );
  const choiceByKey = useMemo(() => {
    const map = new Map<string, string>();
    blanks.forEach((blank) =>
      blank.choices.forEach((choice) => map.set(choice.key, choice.word)),
    );
    return map;
  }, [blanks]);
  const hasKnownAnswers = blanks.every((blank) => blank.answerKeys?.length);
  const filled = blanks.every(
    (blank) =>
      (placements[blank.id]?.length ?? 0) >= (blank.requiredCount ?? 1),
  );
  const correct =
    hasKnownAnswers &&
    blanks.every((blank) => {
      const selected = [...(placements[blank.id] ?? [])].sort().join("|");
      const answer = [...(blank.answerKeys ?? [])].sort().join("|");
      return selected === answer;
    });
  const explanationKey = quizItem
    ? `${quizItem.key}:${Object.entries(placements)
        .map(([blankId, keys]) => `${blankId}:${keys.join(",")}`)
        .join("|")}`
    : "";
  const generatedExplanation = explanationKey
    ? store.quizExplanations[explanationKey]
    : "";
  const questionMistake = quizItem
    ? store.questionMistakes[quizItem.key]
    : undefined;

  useEffect(() => {
    const savedIndex = store.progress.quizIndex ?? 0;
    if (savedIndex >= 0 && savedIndex < quizItems.length) {
      setIndex(savedIndex);
    }
  }, [quizItems.length, store.progress.quizIndex]);

  useEffect(() => {
    const savedMode = store.progress.quizMode === "reading" ? "reading" : "fill";
    if (!modeRestored && savedMode && savedMode !== quizMode) {
      setQuizMode(savedMode);
    }
    if (!modeRestored && savedMode) setModeRestored(true);
  }, [modeRestored, quizMode, store.progress.quizMode]);

  useEffect(() => {
    store.updateProgress({ quizIndex: index, quizMode });
  }, [index, quizMode, store]);

  useEffect(() => {
    setPlacements({});
    setDragChoice(null);
    setSubmitted(false);
    setExplanationStatus("");
  }, [index, quizItem?.key]);

  useEffect(() => {
    if (
      !submitted ||
      !quizItem ||
      !question ||
      !filled ||
      generatedExplanation ||
      explanationStatus
    ) {
      return;
    }

    let cancelled = false;
    setExplanationStatus("正在生成解析...");
    fetch("/api/explain-quiz-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: question.prompt,
        type: question.type,
        blanks,
        placements,
        correct,
      }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result: { explanation?: string } | null) => {
        if (cancelled) return;
        const explanation = result?.explanation?.trim();
        if (explanation) {
          store.updateQuizExplanation(explanationKey, explanation);
          setExplanationStatus("");
        } else {
          setExplanationStatus("解析暂时生成失败，请稍后再试。");
        }
      })
      .catch(() => {
        if (!cancelled) setExplanationStatus("解析暂时生成失败，请稍后再试。");
      });

    return () => {
      cancelled = true;
    };
  }, [
    blanks,
    correct,
    explanationKey,
    explanationStatus,
    filled,
    generatedExplanation,
    placements,
    question,
    quizItem,
    store,
    submitted,
  ]);

  if (!quizItem || !word || !question) {
    return (
      <EmptyState
        icon={ListChecks}
        title="还没有可测试的词"
        text="导入词库后再做主动回忆。"
        actionHref="/admin/import"
        actionText="导入词库"
      />
    );
  }

  function placeChoice(blankId: string, choiceKey: string) {
    const blank = blanks.find((item) => item.id === blankId);
    if (!blank || !blank.choices.some((choice) => choice.key === choiceKey)) {
      return;
    }
    const requiredCount = blank.requiredCount ?? 1;
    setPlacements((current) => {
      const withoutChoice = Object.fromEntries(
        Object.entries(current).map(([id, keys]) => [
          id,
          keys.filter((key) => key !== choiceKey),
        ]),
      );
      const nextKeys = [...(withoutChoice[blankId] ?? []), choiceKey].slice(
        -requiredCount,
      );
      return { ...withoutChoice, [blankId]: nextKeys };
    });
  }

  function placeChoiceInFirstAvailableBlank(choiceKey: string) {
    const blank = blanks.find(
      (item) =>
        item.choices.some((choice) => choice.key === choiceKey) &&
        (placements[item.id]?.length ?? 0) < (item.requiredCount ?? 1),
    ) ?? blanks.find((item) =>
      item.choices.some((choice) => choice.key === choiceKey),
    );
    if (blank) placeChoice(blank.id, choiceKey);
  }

  function clearBlank(blankId: string) {
    setPlacements((current) => ({ ...current, [blankId]: [] }));
  }

  function getFillMistakePayload() {
    const title = question.testNumber
      ? `Test ${question.testNumber} · Section ${question.sectionNumber} · Q${question.questionNumber}`
      : questionTypeLabel(question.type, blanks);
    return {
      id: quizItem.key,
      kind: "fill" as const,
      title,
      prompt: question.prompt,
      answer: formatQuizAnswer(blanks),
    };
  }

  function toggleFillQuestionPin() {
    if (questionMistake) {
      store.clearQuestionMistake(quizItem.key);
      return;
    }
    store.recordQuestionMistake(getFillMistakePayload());
  }

  function submitFillAnswer() {
    setSubmitted(true);
    if (!hasKnownAnswers) return;
    store.recordQuizResult(quizItem.key, correct ? "correct" : "wrong");
    if (correct) {
      store.clearQuestionMistake(quizItem.key);
    } else {
      store.recordQuestionMistake(getFillMistakePayload());
    }
    quizItem.answerWordIds.forEach((wordId) =>
      store.rateWord(wordId, correct ? "good" : "forgot"),
    );
  }

  function jumpToFillQuestion(nextIndex: number) {
    setPlacements({});
    setSubmitted(false);
    setIndex(nextIndex);
    store.updateProgress({ quizIndex: nextIndex });
  }

  return (
    <section className="mx-auto max-w-7xl rounded-md border border-stone-200 bg-white p-5 shadow-sm md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <SectionTitle
          icon={ListChecks}
          title="主动回忆测试"
          subtitle="按 GRE 原题结构练习。填完所有空后提交，再看对错和解析。"
        />
        <QuizModeSwitch
          mode={quizMode}
          onModeChange={(mode) => {
            setQuizMode(mode);
            store.updateProgress({ quizMode: mode });
          }}
        />
      </div>
      {quizMode === "reading" && <ReadingQuizPanel store={store} />}
      {quizMode !== "reading" && (
        <div className="mt-6 grid gap-5 lg:grid-cols-[260px_1fr]">
          <QuizPreviewPanel
            items={quizItems}
            activeIndex={index}
            results={store.quizResults}
            mistakes={store.questionMistakes}
            onJump={jumpToFillQuestion}
          />
          <div>
      <div className="relative rounded-md bg-[#f7f6f1] p-5 pr-16">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "absolute right-4 top-4 h-9 rounded-md bg-white px-3 text-base",
            questionMistake && "border-amber-300 bg-amber-50 text-amber-950",
          )}
          onClick={toggleFillQuestionPin}
          title="钉住这道题"
        >
          📌{questionMistake ? `×${questionMistake.wrongCount}` : ""}
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="select-none border border-amber-200 bg-white text-amber-950 hover:bg-white">
            {questionTypeLabel(question.type, blanks)}
          </Badge>
          {question.testNumber && (
            <Badge
              variant="outline"
              className="select-none rounded-md border-amber-200 bg-white text-amber-950"
            >
              Test {question.testNumber} · Section {question.sectionNumber} · Q{question.questionNumber}
            </Badge>
          )}
        </div>
        <div className="mt-4 text-xl leading-9">
          <PromptWithDropZones
            prompt={question.prompt}
            blanks={blanks}
            placements={placements}
            choiceByKey={choiceByKey}
            onDropChoice={placeChoice}
            onClearBlank={clearBlank}
            dragChoice={dragChoice}
          />
        </div>
        {question.source && <p className="mt-3 text-xs text-slate-500">题库：张巍GRE填空机经</p>}
        {!hasKnownAnswers && (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
            这份 PDF 正文没有官方答案表；这里保留原题选项与空位，不做错误答案判分。
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {blanks.map((blank) => (
          <div
            key={blank.id}
            className="rounded-md border border-slate-200 bg-white p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">
                {blank.label} 选项
              </p>
              {blank.requiredCount === 2 && (
                <Badge variant="outline" className="rounded-md">
                  选 2 个同义词
                </Badge>
              )}
            </div>
            <div className="grid gap-2">
              {blank.choices.map((choice) => {
                const used = Object.values(placements).some((keys) =>
                  keys.includes(choice.key),
                );
                return (
                  <button
                    key={choice.key}
                    type="button"
                    draggable
                    onDragStart={() => setDragChoice(choice.key)}
                    onDragEnd={() => setDragChoice(null)}
                    onClick={() => placeChoiceInFirstAvailableBlank(choice.key)}
                    className={cn(
                      "flex min-h-11 items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition",
                      used
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-[#f7f6f1] hover:border-slate-300 hover:bg-white",
                    )}
                  >
                    <span className="font-medium">{choice.key}</span>
                    <span>{choice.word}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {submitted && (
        <div
          className={cn(
            "mt-5 rounded-md border p-4 text-sm leading-6",
            hasKnownAnswers && correct
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : hasKnownAnswers
                ? "border-orange-200 bg-orange-50 text-orange-950"
                : "border-sky-200 bg-sky-50 text-sky-950",
          )}
        >
          <p className="font-semibold">
            {hasKnownAnswers
              ? correct
                ? "答对了。"
                : "这题不对。"
              : "已提交。"}
          </p>
          <p className="mt-2">{formatQuizAnswer(blanks)}</p>
          <div className="mt-3 rounded-md border border-emerald-200 bg-white/70 p-3 text-sm leading-6 text-emerald-950">
            <p className="font-medium">解析</p>
            <p className="mt-1">
              {generatedExplanation || buildLocalQuizExplanation(question, blanks)}
            </p>
            {explanationStatus && !generatedExplanation && (
              <p className="mt-2 text-xs text-emerald-700">
                {explanationStatus.replace("正在生成解析...", "正在生成更完整解析...")}
              </p>
            )}
          </div>
        </div>
      )}
      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setPlacements({});
            setSubmitted(false);
            const nextIndex = Math.max(0, index - 1);
            setIndex(nextIndex);
            store.updateProgress({ quizIndex: nextIndex });
          }}
        >
          上一题
        </Button>
        <div className="flex gap-2">
          {!submitted && (
            <Button disabled={!filled} onClick={submitFillAnswer}>
              提交答案
            </Button>
          )}
          <Button
            variant={submitted ? "default" : "outline"}
            onClick={() => {
              if (false && submitted && hasKnownAnswers) {
                const mistakeTitle = question.testNumber
                  ? `Test ${question.testNumber} · Section ${question.sectionNumber} · Q${question.questionNumber}`
                  : questionTypeLabel(question.type, blanks);
                if (correct) {
                  store.clearQuestionMistake(quizItem.key);
                } else {
                  store.recordQuestionMistake({
                    id: quizItem.key,
                    kind: "fill",
                    title: mistakeTitle,
                    prompt: question.prompt,
                    answer: formatQuizAnswer(blanks),
                  });
                }
                quizItem.answerWordIds.forEach((wordId) =>
                  store.rateWord(wordId, correct ? "good" : "forgot"),
                );
              }
              setPlacements({});
              setSubmitted(false);
              const nextIndex = index + 1;
              setIndex(nextIndex);
              store.updateProgress({ quizIndex: nextIndex });
            }}
          >
            下一题
          </Button>
        </div>
      </div>
          </div>
        </div>
      )}
    </section>
  );
}

function QuizModeSwitch({
  mode,
  onModeChange,
}: {
  mode: "fill" | "reading";
  onModeChange: (mode: "fill" | "reading") => void;
}) {
  const options: Array<{ key: "fill" | "reading"; label: string }> = [
    { key: "fill", label: "填空题库" },
    { key: "reading", label: "阅读题库" },
  ];
  return (
    <div className="flex rounded-md border border-stone-200 bg-[#f7f6f1] p-1">
      {options.map((option) => (
        <Button
          key={option.key}
          size="sm"
          variant={mode === option.key ? "default" : "ghost"}
          className="h-9 rounded-md px-3 text-sm"
          onClick={() => onModeChange(option.key)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

function QuizPreviewPanel({
  items,
  activeIndex,
  results,
  mistakes,
  onJump,
}: {
  items: ReturnType<typeof buildQuizItems>;
  activeIndex: number;
  results: Record<string, QuizResult>;
  mistakes: Record<string, QuestionMistake>;
  onJump: (index: number) => void;
}) {
  return (
    <aside className="max-h-[720px] overflow-auto rounded-md border border-stone-200 bg-[#f7f6f1] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">题目预览</h2>
          <p className="mt-1 text-xs text-slate-500">点击数字圈跳转</p>
        </div>
        <Badge variant="outline" className="rounded-md bg-white">
          {items.length}
        </Badge>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {items.map((item, itemIndex) => {
          const result = results[item.key];
          const mistake = mistakes[item.key];
          return (
            <button
              key={`${item.key}-${itemIndex}`}
              type="button"
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition",
                result?.status === "correct" &&
                  "border-emerald-200 bg-emerald-50 text-emerald-900",
                result?.status === "wrong" &&
                  "border-rose-200 bg-rose-50 text-rose-900",
                !result && "border-stone-300 bg-white/60 text-slate-950",
                activeIndex === itemIndex &&
                  "border-slate-950 ring-2 ring-slate-950/15",
              )}
              title={
                item.question.testNumber
                  ? `Test ${item.question.testNumber} Section ${item.question.sectionNumber} Q${item.question.questionNumber}`
                  : `Question ${itemIndex + 1}`
              }
              onClick={() => onJump(itemIndex)}
            >
              {itemIndex + 1}
              {mistake && (
                <span className="absolute -right-1 -top-2 rounded-full bg-amber-100 px-1 text-[10px] leading-4 text-amber-950">
                  📌{mistake.wrongCount > 1 ? `×${mistake.wrongCount}` : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function ReadingQuizPanel({ store }: { store: ReturnType<typeof useTrainerStore> }) {
  const [passages, setPassages] = useState<ReadingPassage[]>([]);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(store.progress.readingIndex ?? 0);
  const [selected, setSelected] = useState<Record<number, string[]>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/data/gre-reading-questions.local.json")
      .then((response) => (response.ok ? response.json() : []))
      .then((rows: ReadingPassage[]) => setPassages(rows))
      .catch(() => setPassages([]));
  }, []);

  const filtered = passages;
  const current = filtered[selectedIndex % Math.max(1, filtered.length)];

  useEffect(() => {
    const savedIndex = store.progress.readingIndex ?? 0;
    if (savedIndex >= 0 && savedIndex < passages.length) {
      setSelectedIndex(savedIndex);
    }
  }, [passages.length, store.progress.readingIndex]);

  useEffect(() => {
    store.updateProgress({ readingIndex: selectedIndex });
  }, [selectedIndex, store]);

  useEffect(() => {
    setSelected({});
    setSubmitted(false);
  }, [current?.passage]);

  const autoQuestions = current?.questions.filter(
    (question) => question.choices.length > 0 && question.answerKeys.length > 0,
  ) ?? [];
  const allAutoAnswered = autoQuestions.every(
    (question) => (selected[question.number]?.length ?? 0) > 0,
  );

  function submitReadingAnswers() {
    if (!current) return;
    current.questions.forEach((question) => {
      const id = `reading-${current.passage}-${question.number}`;
      if (!question.choices.length || !question.answerKeys.length) return;
      const picked = selected[question.number] ?? [];
      const isCorrect =
        [...picked].sort().join("") === [...question.answerKeys].sort().join("");
      store.recordQuizResult(id, isCorrect ? "correct" : "wrong");
      if (isCorrect) {
        store.clearQuestionMistake(id);
      } else {
        store.recordQuestionMistake({
          id,
          kind: "reading",
          title: `Passage ${current.passage} · Q${question.number}`,
          prompt: question.stem,
          answer: question.answerKeys.join("/") || question.answer,
        });
      }
      const explanationKey = `reading:${id}:${picked.join("/")}`;
      if (!store.quizExplanations[explanationKey]) {
        fetch("/api/explain-quiz-answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reading: {
              passageText: current.text,
              question: question.stem,
              choices: question.choices,
              answerKeys: question.answerKeys,
              selectedKeys: picked,
              correct: isCorrect,
            },
          }),
        })
          .then((response) => (response.ok ? response.json() : null))
          .then((result: { explanation?: string } | null) => {
            const explanation = result?.explanation?.trim();
            if (explanation) store.updateQuizExplanation(explanationKey, explanation);
          })
          .catch(() => {});
      }
    });
    setSubmitted(true);
  }

  if (!current && passages.length > 0) {
    return (
      <div className="mt-6 rounded-md border border-stone-200 bg-[#f7f6f1] p-5">
        <Label htmlFor="reading-quiz-search-empty">Passage 编号</Label>
        <Input
          id="reading-quiz-search-empty"
          className="mt-2 max-w-sm bg-white"
          value={query}
          placeholder="例如 18"
          onChange={(event) => setQuery(event.target.value)}
        />
        <p className="mt-4 text-sm text-slate-600">
          没有找到这个 Passage。清空搜索可以回到阅读题库。
        </p>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="mt-6 rounded-md border border-stone-200 bg-[#f7f6f1] p-5">
        <p className="text-sm text-slate-600">正在加载阅读题库...</p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-[220px_minmax(360px,0.9fr)_minmax(420px,1fr)]">
      <aside className="max-h-[720px] overflow-auto rounded-md border border-stone-200 bg-[#f7f6f1] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Passage 预览</h2>
            <p className="mt-1 text-xs text-slate-500">点击数字圈跳转</p>
          </div>
          <Badge variant="outline" className="rounded-md bg-white">
            {filtered.length}
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {filtered.map((passage, passageIndex) => {
            const autoIds = passage.questions
              .filter((readingQuestion) => readingQuestion.choices.length > 0 && readingQuestion.answerKeys.length > 0)
              .map((readingQuestion) => `reading-${passage.passage}-${readingQuestion.number}`);
            const hasWrong = autoIds.some(
              (id) => store.quizResults[id]?.status === "wrong",
            );
            const allCorrect =
              autoIds.length > 0 &&
              autoIds.every((id) => store.quizResults[id]?.status === "correct");
            return (
              <button
                key={passage.passage}
                type="button"
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition",
                  allCorrect && "border-emerald-200 bg-emerald-50 text-emerald-900",
                  hasWrong && "border-rose-200 bg-rose-50 text-rose-900",
                  !allCorrect && !hasWrong && "border-stone-300 bg-white/60 text-slate-950",
                  selectedIndex === passageIndex &&
                    "border-slate-950 ring-2 ring-slate-950/15",
                )}
                onClick={() => {
                  setSelectedIndex(passageIndex);
                  store.updateProgress({ readingIndex: passageIndex });
                }}
              >
                {passage.passage}
              </button>
            );
          })}
        </div>
      </aside>
      <aside className="hidden rounded-md border border-stone-200 bg-[#f7f6f1] p-4">
        <Label htmlFor="reading-quiz-search">Passage 编号</Label>
        <Input
          id="reading-quiz-search"
          className="mt-2 bg-white"
          value={query}
          placeholder="例如 18"
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>{filtered.length} 篇</span>
          <span>
            {selectedIndex + 1}/{Math.max(1, filtered.length)}
          </span>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={selectedIndex === 0}
            onClick={() => setSelectedIndex((value) => Math.max(0, value - 1))}
          >
            上一篇
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedIndex >= filtered.length - 1}
            onClick={() =>
              setSelectedIndex((value) =>
                Math.min(filtered.length - 1, value + 1),
              )
            }
          >
            下一篇
          </Button>
        </div>
      </aside>
      <article className="rounded-md border border-stone-200 bg-[#f7f6f1] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge className="border border-amber-200 bg-white text-amber-950 hover:bg-white">
              Reading passage
            </Badge>
            <h2 className="mt-3 text-3xl font-semibold">
              Passage {current.passage}
            </h2>
          </div>
          <Badge variant="outline" className="rounded-md bg-white">
            {current.questions.length} 题
          </Badge>
        </div>
        <div className="mt-5 rounded-md bg-white p-4 text-sm leading-7 text-slate-800">
          {current.text}
        </div>
      </article>
      <section className="max-h-[760px] overflow-auto rounded-md border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge className="border border-amber-200 bg-[#fff8de] text-amber-950 hover:bg-[#fff8de]">
              Reading questions
            </Badge>
            <h2 className="mt-3 text-2xl font-semibold">
              Passage {current.passage} 题目
            </h2>
          </div>
          <Badge variant="outline" className="rounded-md bg-white">
            {current.questions.length} 题
          </Badge>
        </div>
        <div className="mt-5 space-y-4">
          {current.questions.map((question) => {
            const autoScorable =
              question.choices.length > 0 && question.answerKeys.length > 0;
            const requiredCount = Math.max(1, question.answerKeys.length);
            const picked = selected[question.number] ?? [];
            const isCorrect =
              submitted &&
              autoScorable &&
              [...picked].sort().join("") ===
                [...question.answerKeys].sort().join("");
            const readingQuestionId = `reading-${current.passage}-${question.number}`;
            const readingMistake = store.questionMistakes[readingQuestionId];
            const readingExplanationKey = `reading:${readingQuestionId}:${picked.join("/")}`;
            const readingExplanation =
              store.quizExplanations[readingExplanationKey] ||
              `先用题干定位 Passage ${current.passage} 的相关句子，再检查选项是否完整贴合原文语气和范围。正确答案是 ${question.answerKeys.join("/") || question.answer}；如果你的选择和它不同，通常是把局部词句扩大成全文结论，或忽略了作者态度里的限定词。`;
            return (
              <section
                key={question.number}
                className="relative rounded-md border border-stone-200 bg-white p-4 pr-16"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "absolute right-3 top-3 h-8 rounded-md bg-white px-2 text-sm",
                    readingMistake && "border-amber-300 bg-amber-50 text-amber-950",
                  )}
                  onClick={() => {
                    if (readingMistake) {
                      store.clearQuestionMistake(readingQuestionId);
                    } else {
                      store.recordQuestionMistake({
                        id: readingQuestionId,
                        kind: "reading",
                        title: `Passage ${current.passage} · Q${question.number}`,
                        prompt: question.stem,
                        answer: question.answerKeys.join("/") || question.answer,
                      });
                    }
                  }}
                  title="钉住这道题"
                >
                  📌{readingMistake ? `×${readingMistake.wrongCount}` : ""}
                </Button>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold leading-6">
                    {question.number}. {question.stem}
                  </p>
                  {requiredCount > 1 && (
                    <Badge variant="outline" className="rounded-md">
                      多选
                    </Badge>
                  )}
                </div>
                <div className="mt-3 grid gap-2">
                  {question.choices.map((choice) => {
                    const active = picked.includes(choice.key);
                    return (
                      <button
                        key={choice.key}
                        type="button"
                        className={cn(
                          "rounded-md border px-3 py-2 text-left text-sm leading-6 transition",
                          active
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-stone-200 bg-[#f7f6f1] text-slate-900 hover:bg-white",
                        )}
                        onClick={() =>
                          setSelected((currentSelected) => {
                            const currentKeys = currentSelected[question.number] ?? [];
                            const nextKeys = active
                              ? currentKeys.filter((key) => key !== choice.key)
                              : [...currentKeys, choice.key].slice(-requiredCount);
                            return {
                              ...currentSelected,
                              [question.number]: nextKeys,
                            };
                          })
                        }
                      >
                        <span className="font-semibold">{choice.key}. </span>
                        {choice.text}
                      </button>
                    );
                  })}
                </div>
                {!autoScorable && (
                  <div className="mt-3 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-950">
                    这题不是标准 A-E 选择判分题，先显示原答案定位：{question.answer || "暂无答案"}
                  </div>
                )}
                {submitted && autoScorable && (
                  <div
                    className={cn(
                      "mt-3 rounded-md border p-3 text-sm",
                      isCorrect
                        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                        : "border-orange-200 bg-orange-50 text-orange-950",
                    )}
                  >
                    {isCorrect ? "答对了。" : "这题不对。"} 正确答案：
                    {question.answerKeys.join("/") || question.answer}
                    <div className="mt-2 rounded-md border border-emerald-200 bg-white/70 p-3 text-emerald-950">
                      <p className="font-medium">解析</p>
                      <p className="mt-1">{readingExplanation}</p>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            disabled={submitted || (autoQuestions.length > 0 && !allAutoAnswered)}
            onClick={submitReadingAnswers}
          >
            提交阅读答案
          </Button>
        </div>
      </section>
    </div>
  );
}

type ReadingAnswer = {
  passage: number;
  rawAnswer: string;
  answers: string[];
  source: string;
};

type ReadingQuestion = {
  number: number;
  stem: string;
  choices: Array<{ key: string; text: string }>;
  answer: string;
  answerKeys: string[];
};

type ReadingPassage = {
  passage: number;
  text: string;
  questions: ReadingQuestion[];
  rawAnswers: string[];
  source: string;
};

export function ReadingAnswersLookup() {
  const [answers, setAnswers] = useState<ReadingAnswer[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/data/gre-reading-answers.local.json")
      .then((response) => (response.ok ? response.json() : []))
      .then((rows: ReadingAnswer[]) => setAnswers(rows))
      .catch(() => setAnswers([]));
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim();
    if (!normalized) return answers.slice(0, 60);
    const passage = Number(normalized.replace(/\D/g, ""));
    return answers.filter((item) =>
      passage ? item.passage === passage : item.rawAnswer.includes(normalized),
    );
  }, [answers, query]);

  return (
    <div className="min-h-screen bg-[#f7f6f1] text-slate-950">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <SectionTitle
              icon={ListChecks}
              title="阅读机经答案库"
              subtitle="按 Passage 编号查询。阅读题干后续会继续结构化成正式测试。"
            />
            <Button asChild variant="outline">
              <Link href="/quiz">返回填空测试</Link>
            </Button>
          </div>
          <div className="mt-6">
            <Label htmlFor="reading-answer-search">Passage 编号</Label>
            <Input
              id="reading-answer-search"
              className="mt-2 max-w-sm"
              value={query}
              placeholder="例如 18 或 Passage 18"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {filtered.map((item) => (
              <article
                key={item.passage}
                className="rounded-md border border-slate-200 bg-[#f7f6f1] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">
                    Passage {item.passage}
                  </h2>
                  <Badge className="bg-white text-slate-700 hover:bg-white">
                    {item.answers.length} 项
                  </Badge>
                </div>
                <p className="mt-3 text-base leading-7 text-slate-950">
                  {item.rawAnswer}
                </p>
                <p className="mt-3 text-xs text-slate-500">{item.source}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

type QuizItem = {
  key: string;
  word: Word;
  question: NonNullable<Word["quizQuestion"]>;
  answerWordIds: string[];
};

function buildQuizItems(words: Word[]): QuizItem[] {
  const byKey = new Map<string, QuizItem>();
  const wordByValue = new Map(words.map((word) => [word.word, word]));

  words.forEach((word) => {
    const question = word.quizQuestion;
    if (!question) return;
    const key = [
      question.testNumber ?? "local",
      question.sectionNumber ?? "0",
      question.questionNumber ?? question.prompt.slice(0, 80),
    ].join("-");
    const answerWords = (question.blanks ?? [])
      .flatMap((blank) =>
        (blank.answerKeys ?? []).flatMap((key) =>
          blank.choices
            .filter((choice) => choice.key === key)
            .map((choice) => choice.word),
        ),
      )
      .map((value) => wordByValue.get(value)?.id)
      .filter((value): value is string => Boolean(value));

    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        word,
        question,
        answerWordIds: answerWords.length ? answerWords : [word.id],
      });
    }
  });

  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function formatQuizAnswer(blanks: QuizBlank[]) {
  const parts = blanks.map((blank) => {
    const keys = blank.answerKeys ?? [];
    const words = blank.choices
      .filter((choice) => keys.includes(choice.key))
      .map((choice) => `${choice.key}. ${choice.word}`);
    return `${blank.label}: ${words.join(" / ") || "暂无答案"}`;
  });
  return `正确答案：${parts.join("；")}`;
}

function buildLocalQuizExplanation(
  question: NonNullable<Word["quizQuestion"]>,
  blanks: QuizBlank[],
) {
  const answers = blanks
    .map((blank) => {
      const words = blank.choices
        .filter((choice) => blank.answerKeys?.includes(choice.key))
        .map((choice) => choice.word);
      return `${blank.label} 应填 ${words.join(" / ")}`;
    })
    .join("；");
  const prompt = question.prompt.toLowerCase();
  const logic =
    prompt.includes("because") || prompt.includes("therefore") || prompt.includes("thus")
      ? "题干是因果/递进关系，空格要顺着前后文的评价方向走。"
      : prompt.includes("although") || prompt.includes("despite") || prompt.includes("yet")
        ? "题干有转折关系，空格要和转折前后的语气形成对照。"
        : prompt.includes("just as") || prompt.includes("similarly")
          ? "题干是类比关系，空格要和对应对象保持同一逻辑方向。"
          : "先判断空格前后的褒贬和语义方向，再排除不符合句子关系的词。";
  return `${logic}${answers}，这些词能把句子的核心关系补完整。`;
}

function buildQuizBlanks(word: Word, words: Word[]): QuizBlank[] {
  const question = word.quizQuestion;
  if (question?.blanks?.length) return question.blanks;

  const baseChoices = question?.choices?.length
    ? question.choices
    : [
        word.word,
        ...words
          .filter((item) => item.id !== word.id)
          .slice(0, 5)
          .map((item) => item.word),
      ].slice(0, 6);

  const choices = baseChoices.map((choice, index) => ({
    key: String.fromCharCode(65 + index),
    word: choice,
  }));
  const answerChoice = choices.find((choice) => choice.word === question?.answer);
  const isSentenceEquivalence =
    !/\((?:i|ii|iii)\)\s*_{2,}/i.test(question?.prompt ?? "") &&
    choices.length === 6;

  return [
    {
      id: "blank-1",
      label: isSentenceEquivalence ? "同义词等价空" : "空格",
      choices,
      answerKeys: answerChoice ? [answerChoice.key] : undefined,
      requiredCount: isSentenceEquivalence ? 2 : 1,
    },
  ];
}

function questionTypeLabel(
  type: NonNullable<Word["quizQuestion"]>["type"] | undefined,
  blanks: QuizBlank[],
) {
  if (type === "sentence-equivalence") return "Sentence equivalence · 选 2 个";
  if (type === "multi-blank") return `Text completion · ${blanks.length} 空`;
  if (type === "single-blank") return "Text completion · 单空";
  if (blanks.some((blank) => blank.requiredCount === 2)) {
    return "Sentence equivalence · 选 2 个";
  }
  return blanks.length > 1
    ? `Text completion · ${blanks.length} 空`
    : "Text completion · 单空";
}

function PromptWithDropZones({
  prompt,
  blanks,
  placements,
  choiceByKey,
  dragChoice,
  onDropChoice,
  onClearBlank,
}: {
  prompt: string;
  blanks: QuizBlank[];
  placements: Record<string, string[]>;
  choiceByKey: Map<string, string>;
  dragChoice: string | null;
  onDropChoice: (blankId: string, choiceKey: string) => void;
  onClearBlank: (blankId: string) => void;
}) {
  const nodes: ReactNode[] = [];
  const pattern = /(\((?:i|ii|iii)\)\s*_{2,}|_{2,})/gi;
  let lastIndex = 0;
  let fallbackIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(prompt))) {
    const text = prompt.slice(lastIndex, match.index);
    if (text) nodes.push(text);

    const token = match[0];
    const roman = token.match(/\((i|ii|iii)\)/i)?.[1]?.toLowerCase();
    const blank =
      (roman ? blanks.find((item) => item.id === roman) : undefined) ??
      blanks[fallbackIndex] ??
      blanks[0];

    if (blank) {
      nodes.push(
        <InlineBlankDropZone
          key={`${blank.id}-${match.index}`}
          blank={blank}
          selectedKeys={placements[blank.id] ?? []}
          choiceByKey={choiceByKey}
          dragChoice={dragChoice}
          onDropChoice={onDropChoice}
          onClearBlank={onClearBlank}
        />,
      );
      fallbackIndex += 1;
    } else {
      nodes.push(token);
    }
    lastIndex = pattern.lastIndex;
  }

  const rest = prompt.slice(lastIndex);
  if (rest) nodes.push(rest);

  return (
    <div>
      <p className="leading-10">{nodes}</p>
      {nodes.length === 1 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {blanks.map((blank) => (
            <InlineBlankDropZone
              key={blank.id}
              blank={blank}
              selectedKeys={placements[blank.id] ?? []}
              choiceByKey={choiceByKey}
              dragChoice={dragChoice}
              onDropChoice={onDropChoice}
              onClearBlank={onClearBlank}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InlineBlankDropZone({
  blank,
  selectedKeys,
  choiceByKey,
  dragChoice,
  onDropChoice,
  onClearBlank,
}: {
  blank: QuizBlank;
  selectedKeys: string[];
  choiceByKey: Map<string, string>;
  dragChoice: string | null;
  onDropChoice: (blankId: string, choiceKey: string) => void;
  onClearBlank: (blankId: string) => void;
}) {
  const canDrop =
    !!dragChoice && blank.choices.some((choice) => choice.key === dragChoice);

  function handleDrop(event: DragEvent<HTMLSpanElement>) {
    event.preventDefault();
    if (dragChoice) onDropChoice(blank.id, dragChoice);
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onDragOver={(event) => {
        if (canDrop) event.preventDefault();
      }}
      onDrop={handleDrop}
      onDoubleClick={() => onClearBlank(blank.id)}
      className={cn(
        "mx-1 inline-flex min-h-12 min-w-36 align-middle flex-wrap items-center justify-center gap-1 rounded-md border-2 border-dashed px-3 py-1 text-base transition",
        canDrop
          ? "border-emerald-400 bg-emerald-50"
          : "border-slate-300 bg-white",
      )}
      title="拖入词块；双击清空"
    >
      <span className="text-xs font-semibold text-slate-500">{blank.label}</span>
      {selectedKeys.length ? (
        selectedKeys.map((key) => (
          <span
            key={key}
            className="rounded-md bg-slate-950 px-2 py-1 text-sm font-medium text-white"
          >
            {key}. {choiceByKey.get(key) ?? key}
          </span>
        ))
      ) : (
        <span className="text-sm text-slate-400">拖到这里</span>
      )}
    </span>
  );
}

function MiniQuizOptions({ question }: { question: NonNullable<Word["quizQuestion"]> }) {
  if (question.blanks?.length) {
    return (
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {question.blanks.map((blank) => (
          <div key={blank.id} className="rounded-md bg-white p-3">
            <p className="text-xs font-semibold text-sky-800">{blank.label}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {blank.choices.map((choice) => (
                <Badge key={choice.key} variant="outline" className="rounded-md">
                  {choice.key}. {choice.word}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {question.choices.map((choice) => (
        <Badge
          key={choice}
          variant={choice === question.answer ? "default" : "outline"}
          className="rounded-md"
        >
          {choice}
        </Badge>
      ))}
    </div>
  );
}

function WeakWordsPage({ store }: { store: ReturnType<typeof useTrainerStore> }) {
  const memoryByWord = new Map(store.memories.map((memory) => [memory.wordId, memory]));
  const forgottenWords = store.words.filter((word) => {
    const memory = memoryByWord.get(word.id) ?? fallbackMemory(word.id);
    return memory.lastRating === "forgot" || memory.wrongCount > 0;
  });
  const questionMistakes = Object.values(store.questionMistakes).sort(
    (a, b) => b.lastWrongAt.localeCompare(a.lastWrongAt),
  );

  if (questionMistakes.length === 0 && forgottenWords.length === 0) {
    return (
      <EmptyState
        icon={HeartPulse}
        title="错词急救区现在是空的"
        text="连续忘记或答错的词会自动出现在这里，方便集中复盘和导出。"
        actionHref="/session"
        actionText="继续学习"
      />
    );
  }

  return (
    <section>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <SectionTitle
          icon={HeartPulse}
          title="错词急救区"
          subtitle="忘记不是失败。这里帮你换一条更容易记住的路径。"
        />
        <Button
          className="gap-2"
          onClick={() => exportWeakWordsToExcel(forgottenWords, memoryByWord, store.notes)}
        >
          <FileUp className="h-4 w-4" />
          一键导出 Excel
        </Button>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">题目错误库</h2>
              <p className="mt-1 text-sm text-slate-600">
                做错的填空和阅读会自动累计。再次做对会从这里移出。
              </p>
            </div>
            <Badge className="rounded-md bg-amber-100 text-amber-950 hover:bg-amber-100">
              {questionMistakes.length} 题
            </Badge>
          </div>
          <div className="mt-4 space-y-3">
            {questionMistakes.length === 0 ? (
              <div className="rounded-md border border-dashed border-stone-300 bg-[#f7f6f1] p-4 text-sm text-slate-600">
                目前没有错题。提交测试后，答错的题目会出现在这里。
              </div>
            ) : (
              questionMistakes.map((mistake) => (
                <article
                  key={mistake.id}
                  className="rounded-md border border-stone-200 bg-[#fbfaf6] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant="outline" className="rounded-md bg-white">
                        {mistake.kind === "reading" ? "阅读" : "填空"}
                      </Badge>
                      <h3 className="mt-2 font-semibold">{mistake.title}</h3>
                    </div>
                    <Badge className="rounded-md bg-amber-100 text-amber-950 hover:bg-amber-100">
                      📌×{mistake.wrongCount}
                    </Badge>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-700">
                    {mistake.prompt}
                  </p>
                  <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
                    正确答案：{mistake.answer}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>最后答错：{new Date(mistake.lastWrongAt).toLocaleString()}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => store.clearQuestionMistake(mistake.id)}
                    >
                      已掌握，移出
                    </Button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
        <section className="rounded-md border border-stone-200 bg-[#fbfaf6] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">毫无印象单词库</h2>
              <p className="mt-1 text-sm text-slate-600">
                和单词卡里的“完全不记得”同步，适合集中二刷。
              </p>
            </div>
            <Badge className="rounded-md bg-orange-100 text-orange-950 hover:bg-orange-100">
              {forgottenWords.length} 词
            </Badge>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {forgottenWords.map((word) => (
              <Link
                key={word.id}
                href={`/visual?word=${word.id}`}
                onClick={() => store.updateProgress({ visualWordId: word.id })}
                className="grid min-h-16 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm transition hover:border-slate-400 hover:shadow-sm"
              >
                <span className="flex items-center justify-between gap-2 font-semibold">
                  {word.word}
                  {store.pinnedWords[word.id] ? (
                    <span className="text-xs text-amber-700">
                      📌×{store.pinnedWords[word.id]}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 line-clamp-1 text-xs text-slate-600">
                  {word.coreMeaningCn}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function ProfilePage({
  store,
  derived,
}: {
  store: ReturnType<typeof useTrainerStore>;
  derived: ReturnType<typeof useDerivedTrainerData>;
}) {
  const [draft, setDraft] = useState(store.profile);
  const noteCount = Object.values(store.notes).filter(Boolean).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-md bg-[#f7f6f1] text-5xl">
            {store.profile.emoji}
          </div>
          <h1 className="mt-4 text-2xl font-semibold">{store.profile.name}</h1>
          <p className="mt-2 text-sm text-slate-600">{store.profile.goalLabel}</p>
        </div>
        <Separator className="my-6" />
        <div className="grid grid-cols-2 gap-3">
          <Metric label="今日完成" value={`${derived.completedToday} 词`} />
          <Metric label="掌握" value={`${derived.masteredCount} 词`} />
          <Metric label="笔记" value={`${noteCount} 条`} />
          <Metric label="错词" value={`${derived.atRiskCount} 词`} />
        </div>
        <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
          <p className="font-medium">小徽章</p>
          <p className="mt-1">🎈 100 词庆祝 · 🧠 主动回忆 · 🌿 小轮学习</p>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <SectionTitle
          icon={Smile}
          title="用户中心"
          subtitle="先做本地用户中心；上线多人版时可以接 Supabase、Clerk 或 NextAuth。"
        />
        <div className="mt-6 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="profile-name">昵称</Label>
            <Input
              id="profile-name"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-emoji">头像 Emoji</Label>
            <Input
              id="profile-emoji"
              value={draft.emoji}
              onChange={(event) => setDraft({ ...draft, emoji: event.target.value })}
              maxLength={4}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-goal">目标签名</Label>
            <Input
              id="profile-goal"
              value={draft.goalLabel}
              onChange={(event) =>
                setDraft({ ...draft, goalLabel: event.target.value })
              }
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["🌱", "🧠", "🎯", "✨", "🎈", "📚"].map((emoji) => (
              <Button
                key={emoji}
                variant="outline"
                className="h-10 w-10 rounded-md p-0 text-lg"
                onClick={() => setDraft({ ...draft, emoji })}
              >
                {emoji}
              </Button>
            ))}
          </div>
          <Button onClick={() => store.updateProfile(draft)}>保存用户资料</Button>
        </div>
      </section>
    </div>
  );
}

function WordMapPage({ store }: { store: ReturnType<typeof useTrainerStore> }) {
  const memoryByWord = new Map(store.memories.map((memory) => [memory.wordId, memory]));

  return (
    <section>
      <SectionTitle
        icon={Grid3X3}
        title="单词地图"
        subtitle="绿色已掌握，黄色复习中，橙色快忘了，灰色未学习。"
      />
      <div className="mt-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {store.words.map((word) => {
            const memory = memoryByWord.get(word.id) ?? fallbackMemory(word.id);
            return (
              <Link
                key={word.id}
                href={`/visual?word=${word.id}`}
                className={cn(
                  "flex min-h-20 flex-col justify-between rounded-md p-3 text-sm transition hover:scale-[1.01]",
                  statusColor[memory.status],
                )}
              >
                <span className="font-semibold">{word.word}</span>
                <span className="text-xs opacity-80">
                  {statusLabel[memory.status]}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function RootsPage({ store }: { store: ReturnType<typeof useTrainerStore> }) {
  const groups = useMemo(() => {
    const map = new Map<string, Word[]>();
    store.words.forEach((word) => {
      getWordRootGroups(word).forEach((root) => {
        map.set(root, [...(map.get(root) ?? []), word]);
      });
    });
    return [...map.entries()]
      .filter(([, words]) => words.length >= 6)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 28);
  }, [store.words]);

  return (
    <section>
      <SectionTitle
        icon={Leaf}
        title="词根词缀"
        subtitle="用词根把零散单词连成更少的记忆块。"
      />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {groups.map(([root, words]) => (
          <article
            key={root}
            className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{root}</h2>
              <Badge variant="outline" className="rounded-md bg-[#f7f6f1]">
                {words.length} 词
              </Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {words.slice(0, 42).map((word) => (
                <Link key={word.id} href={`/visual?word=${word.id}`}>
                  <Badge variant="outline" className="rounded-md bg-[#f7f6f1] text-slate-700">
                    {word.word}
                  </Badge>
                </Link>
              ))}
              {words.length > 42 && (
                <Badge variant="outline" className="rounded-md bg-white text-slate-500">
                  +{words.length - 42}
                </Badge>
              )}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              小测试：看到这些同根词时，先说出共同方向，再背单个释义。
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function getWordRootGroups(word: Word) {
  if (word.roots?.length) return word.roots;
  const value = word.word.toLowerCase();
  const prefixes = [
    "ab",
    "ad",
    "ac",
    "af",
    "ag",
    "al",
    "an",
    "ap",
    "ar",
    "as",
    "at",
    "ante",
    "anti",
    "bene",
    "circum",
    "com",
    "con",
    "de",
    "dis",
    "en",
    "em",
    "ex",
    "extra",
    "hyper",
    "in",
    "im",
    "ir",
    "il",
    "inter",
    "mis",
    "non",
    "ob",
    "per",
    "pre",
    "pro",
    "re",
    "sub",
    "super",
    "trans",
    "un",
  ];
  const prefix = prefixes
    .sort((a, b) => b.length - a.length)
    .find((item) => value.startsWith(item) && value.length > item.length + 2);
  return [prefix ? `${prefix}- 开头` : `${value.slice(0, 2)}- 开头`];
}

function SettingsPage({ store }: { store: ReturnType<typeof useTrainerStore> }) {
  const settings = store.settings;
  const update = <Key extends keyof TrainerSettings>(
    key: Key,
    value: TrainerSettings[Key],
  ) => store.setSettings((current) => ({ ...current, [key]: value }));

  return (
    <section className="mx-auto max-w-3xl rounded-md border border-slate-200 bg-white p-5 shadow-sm md:p-7">
      <SectionTitle
        icon={Settings}
        title="设置"
        subtitle="按你的 200-500 词/天目标调整强度，但保持小块学习。"
      />
      <div className="mt-6 space-y-6">
        <FieldRow
          label="每日目标"
          hint="高强度背词建议拆成很多轮。"
          control={
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={settings.dailyTarget}
              onChange={(event) =>
                update("dailyTarget", Number(event.target.value) as 200 | 300 | 500)
              }
            >
              <option value={200}>200 词</option>
              <option value={300}>300 词</option>
              <option value={500}>500 词</option>
            </select>
          }
        />
        <FieldRow
          label="每轮学习数量"
          hint="短记忆周期优先 5-8 个词。"
          control={
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={settings.sessionSize}
              onChange={(event) =>
                update("sessionSize", Number(event.target.value) as 5 | 8 | 10)
              }
            >
              <option value={5}>5 个</option>
              <option value={8}>8 个</option>
              <option value={10}>10 个</option>
            </select>
          }
        />
        <SwitchRow
          label="休息提醒"
          checked={settings.breakReminder}
          onCheckedChange={(checked) => update("breakReminder", checked)}
        />
        <SwitchRow
          label="视觉模式"
          checked={settings.visualMode}
          onCheckedChange={(checked) => update("visualMode", checked)}
        />
        <SwitchRow
          label="专注模式默认开启"
          checked={settings.focusDefault}
          onCheckedChange={(checked) => update("focusDefault", checked)}
        />
        <SwitchRow
          label="深色模式"
          checked={settings.darkMode}
          onCheckedChange={(checked) => update("darkMode", checked)}
        />
        <Button variant="outline" onClick={store.resetDemo}>
          重置为示例数据
        </Button>
      </div>
    </section>
  );
}

function ImportPage({ store }: { store: ReturnType<typeof useTrainerStore> }) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [loadingExtracted, setLoadingExtracted] = useState(false);

  function handleImport() {
    try {
      const raw = text.trim().startsWith("[")
        ? (JSON.parse(text) as Record<string, unknown>[])
        : text.trim().startsWith("{")
          ? ((JSON.parse(text) as { words?: Record<string, unknown>[] }).words ?? [])
          : parseCsv(text);

      const nextWords = raw.map(normalizeImportedWord).filter((word) => word.word);
      if (nextWords.length === 0) {
        setMessage("没有识别到词条。请检查 CSV 表头或 JSON 字段。");
        return;
      }
      store.importWords(nextWords);
      setMessage(`已导入 ${nextWords.length} 个词。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入失败。");
    }
  }

  async function loadExtractedPdfWords() {
    setLoadingExtracted(true);
    setMessage("正在加载 PDF 提取词库...");
    try {
      const response = await fetch("/data/gre-vocab-extracted.local.json");
      if (!response.ok) {
        throw new Error("没有找到已提取的 PDF 词库，请先运行 scripts/extract-gre-pdfs.py。");
      }
      const nextWords = (await response.json()) as Word[];
      store.importWords(nextWords);
      setMessage(`已加载 PDF 提取词库：${nextWords.length} 个词。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载失败。");
    } finally {
      setLoadingExtracted(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl rounded-md border border-slate-200 bg-white p-5 shadow-sm md:p-7">
      <SectionTitle
        icon={FileUp}
        title="GRE 词库导入"
        subtitle="支持 CSV 或 JSON。不要复制或爬取没有授权的数据。"
      />
      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_280px]">
        <div>
          <Label htmlFor="word-import">词库内容</Label>
          <Textarea
            id="word-import"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="word,core_meaning_cn,core_meaning_en,example_sentence,synonyms,antonyms,memory_hook_cn"
            className="mt-2 min-h-80 font-mono text-sm"
          />
          {message && (
            <p className="mt-3 rounded-md bg-[#f7f6f1] px-3 py-2 text-sm">
              {message}
            </p>
          )}
          <div className="mt-4 flex gap-3">
            <Button onClick={handleImport} className="gap-2">
              <FileUp className="h-4 w-4" />
              导入词库
            </Button>
            <Button
              variant="secondary"
              onClick={loadExtractedPdfWords}
              disabled={loadingExtracted}
            >
              {loadingExtracted ? "加载中..." : "加载已提取 PDF 词库"}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setText(
                  "word,core_meaning_cn,core_meaning_en,example_sentence,synonyms,antonyms,memory_hook_cn\n" +
                    "lucid,清晰的,easy to understand,Her lucid explanation clarified the theorem.,clear|coherent,confusing|obscure,lucid 像 light，灯打开后思路清晰。",
                )
              }
            >
              填入示例
            </Button>
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-[#f7f6f1] p-4 text-sm leading-6">
          <p className="font-medium">推荐字段</p>
          <p className="mt-2 text-slate-600">
            word, phonetic, core_meaning_cn, core_meaning_en,
            example_sentence, example_translation_cn, synonyms, antonyms, roots,
            visual_keyword, image_prompt, memory_hook_cn, difficulty_level,
            frequency_tag, category_tags
          </p>
          <Separator className="my-4" />
          <p className="text-slate-600">
            你的目标是每天 200-500 个词，所以导入完整词库后，系统会按设置把大目标拆成多个小轮次。
          </p>
          <p className="mt-3 text-slate-600">
            公开部署前，请确认 PDF 词库内容有公开发布授权；否则建议只保留导入功能，不把提取数据打包到公开站点。
          </p>
        </div>
      </div>
    </section>
  );
}

function WordDetailPage({
  store,
  wordId,
}: {
  store: ReturnType<typeof useTrainerStore>;
  wordId?: string;
}) {
  const word = store.words.find((item) => item.id === wordId) ?? store.words[0];
  if (!word) {
    return (
      <EmptyState
        icon={Search}
        title="没有找到这个词"
        text="可能还没有导入词库。"
        actionHref="/admin/import"
        actionText="导入词库"
      />
    );
  }
  const memory =
    store.memories.find((item) => item.wordId === word.id) ??
    fallbackMemory(word.id);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <WordCard
        word={word}
        memory={memory}
        note={store.notes[word.id] ?? ""}
        imageSrc={store.generatedImages[word.id] ?? word.imageUrl ?? getWordAssetImage(word)}
        imageStatus={store.imageStatus[word.id]}
        pinnedCount={store.pinnedWords[word.id] ?? 0}
        onRate={(rating) => {
          store.rateWord(word.id, rating);
          if (rating === "forgot") store.incrementPinnedWord(word.id);
        }}
        onNoteChange={(note) => store.updateNote(word.id, note)}
        onTogglePin={() => store.togglePinnedWord(word.id)}
        onGenerateImage={() => store.generateImage(word)}
      />
      <VisualMemoryCard
        word={word}
        imageSrc={store.generatedImages[word.id] ?? word.imageUrl ?? getWordAssetImage(word)}
        imageStatus={store.imageStatus[word.id]}
        pinnedCount={store.pinnedWords[word.id] ?? 0}
        onTogglePin={() => store.togglePinnedWord(word.id)}
        onGenerateImage={() => store.generateImage(word)}
        compact
      />
    </div>
  );
}

function GuessCard({
  word,
  onReveal,
  compact,
}: {
  word: Word;
  onReveal: () => void;
  compact?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-md border border-slate-200 bg-white p-5 shadow-sm md:p-8",
        compact && "md:p-6",
      )}
    >
      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <div>
          <Badge className="bg-sky-100 text-sky-950 hover:bg-sky-100">
            Step 1 · 看图猜词义
          </Badge>
          <h2 className="mt-5 text-4xl font-semibold md:text-6xl">
            {word.visualKeyword}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            {word.visualScene}
          </p>
          <div className="mt-6 rounded-md border border-slate-200 bg-[#f7f6f1] p-4 text-sm text-slate-600">
            先暂停 5 秒：这个画面可能对应什么 GRE 词义？
          </div>
          <Button onClick={onReveal} className="mt-6 gap-2">
            显示单词和答案
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <VisualScenePanel word={word} />
      </div>
    </article>
  );
}

function WordCard({
  word,
  memory,
  note,
  imageSrc,
  imageStatus,
  pinnedCount,
  onRate,
  onNoteChange,
  onTogglePin,
  onGenerateImage,
  compact,
}: {
  word: Word;
  memory: UserWordMemory;
  note: string;
  imageSrc?: string;
  imageStatus?: string;
  pinnedCount: number;
  onRate: (rating: Rating) => void;
  onNoteChange: (note: string) => void;
  onTogglePin: () => void;
  onGenerateImage: () => void;
  compact?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-md border border-slate-200 bg-white p-4 text-slate-950 shadow-sm md:p-6",
        compact && "md:p-5",
      )}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={statusColor[memory.status]}>
                {statusLabel[memory.status]}
              </Badge>
              <Badge variant="outline" className="rounded-md text-slate-700">
                GRE {word.frequencyTag}
              </Badge>
              <Badge variant="outline" className="rounded-md text-slate-700">
                难度 {word.difficultyLevel}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 rounded-md px-3 text-base",
                pinnedCount > 0 && "border-amber-300 bg-amber-50 text-amber-950",
              )}
              onClick={onTogglePin}
              title="钉住这个单词"
            >
              📌{pinnedCount > 1 ? `×${pinnedCount}` : ""}
            </Button>
          </div>
          <h2
            className={cn(
              "mt-4 font-semibold tracking-normal text-slate-950",
              compact ? "text-5xl md:text-6xl" : "text-5xl md:text-7xl",
            )}
          >
            {word.word}
          </h2>
          {word.phonetic && (
            <p className="mt-2 font-mono text-sm text-slate-500">
              {word.phonetic}
            </p>
          )}
          <GreMeaningBlock word={word} />
          <div className="mt-3 rounded-md bg-[#f7f6f1] p-3">
            <p className="text-sm font-medium text-slate-500">例句</p>
            <p className="mt-1 text-base leading-7 text-slate-950">{word.example}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{word.translation}</p>
          </div>
          {word.quizQuestion && (
            <div className="mt-3 rounded-md border border-sky-200 bg-sky-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-white text-sky-950 hover:bg-white">
                  机经填空
                </Badge>
                <span className="text-xs text-sky-800">
                  {word.quizQuestion.source}
                </span>
              </div>
              <p className="mt-3 text-base leading-7 text-sky-950">
                {word.quizQuestion.prompt}
              </p>
              <MiniQuizOptions question={word.quizQuestion} />
            </div>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ChipBlock label="同义词" items={word.synonyms} compact={compact} />
            <ChipBlock label="反义词" items={word.antonyms} compact={compact} />
          </div>
        </div>
        <div className="space-y-4">
          <VisualScenePanel
            word={word}
            imageSrc={imageSrc}
            imageStatus={imageStatus}
            onGenerateImage={onGenerateImage}
          />
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
            <p className="font-medium">记忆钩子</p>
            <p className="mt-1">{word.memoryHookCn}</p>
          </div>
        </div>
      </div>
      <MemoryNotes
        word={word.word}
        note={note}
        onNoteChange={onNoteChange}
        compact={compact}
      />
      <RatingButtons onRate={onRate} />
    </article>
  );
}

function MemoryNotes({
  word,
  note,
  onNoteChange,
  compact,
}: {
  word: string;
  note: string;
  onNoteChange: (note: string) => void;
  compact?: boolean;
}) {
  const prompts = [
    "我为什么会忘？",
    "我的荒诞画面",
    "易混词对比",
    "自己造一个例句",
  ];

  return (
    <section className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-sky-950">记忆区 / 评论区</p>
          <p className="mt-1 text-sm leading-5 text-sky-800">
            给 {word} 写你自己的联想、错因、谐音、例句。这个区域会自动保存。
          </p>
        </div>
        <Badge className="bg-white text-sky-950 hover:bg-white">私人笔记</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-md bg-white"
            onClick={() =>
              onNoteChange(
                note ? `${note}\n${prompt}：` : `${prompt}：`,
              )
            }
          >
            {prompt}
          </Button>
        ))}
      </div>
      <Textarea
        className={cn("mt-2 bg-white text-slate-950", compact ? "min-h-20" : "min-h-24")}
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder="例如：laconic = lack sonic，缺少声音；和 verbose 相反。"
      />
    </section>
  );
}

function CelebrationOverlay({
  count,
  onClose,
}: {
  count: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 5500);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 18 }).map((_, index) => (
          <span
            key={index}
            className="absolute bottom-[-80px] h-16 w-10 rounded-full opacity-90 shadow-lg"
            style={{
              left: `${(index * 7) % 100}%`,
              background:
                index % 3 === 0
                  ? "#bae6fd"
                  : index % 3 === 1
                    ? "#bbf7d0"
                    : "#fed7aa",
              animation: `balloon-rise ${4 + (index % 5) * 0.35}s ease-in forwards`,
              animationDelay: `${index * 0.08}s`,
            }}
          />
        ))}
      </div>
      <section className="relative max-w-md rounded-md border border-white/70 bg-white p-7 text-center shadow-xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-md bg-emerald-50 text-4xl">
          🎈
        </div>
        <h2 className="mt-5 text-3xl font-semibold">完成 {count} 个词</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          很好，系统已经记录这个里程碑。现在可以休息，也可以继续下一轮。
        </p>
        <Button className="mt-6" onClick={onClose}>
          继续
        </Button>
      </section>
    </div>
  );
}

function VisualMemoryCard({
  word,
  imageSrc,
  imageStatus,
  pinnedCount,
  onTogglePin,
  onGenerateImage,
  compact,
}: {
  word: Word;
  imageSrc?: string;
  imageStatus?: string;
  pinnedCount: number;
  onTogglePin: () => void;
  onGenerateImage: () => void;
  compact?: boolean;
}) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm md:p-7">
      <SectionTitle
        icon={Sparkles}
        title="视觉记忆卡"
        subtitle="把抽象词变成一眼能回想的场景。"
      />
      <div className={cn("mt-6 grid gap-6", !compact && "lg:grid-cols-[1fr_1fr]")}>
        <VisualScenePanel
          word={word}
          imageSrc={imageSrc}
          imageStatus={imageStatus}
          onGenerateImage={onGenerateImage}
          large
        />
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge className="bg-sky-100 text-sky-950 hover:bg-sky-100">
              {word.coreMeaningEn}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 rounded-md px-3 text-base",
                pinnedCount > 0 && "border-amber-300 bg-amber-50 text-amber-950",
              )}
              onClick={onTogglePin}
            >
              📌{pinnedCount > 1 ? `×${pinnedCount}` : ""}
            </Button>
          </div>
          <h2 className="mt-4 text-4xl font-semibold md:text-6xl">
            {word.word}
          </h2>
          <p className="mt-3 text-lg text-slate-700">{word.coreMeaningCn}</p>
          <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 leading-7 text-emerald-950">
            {word.memoryHookCn}
          </div>
          <div className="mt-4 rounded-md bg-[#f7f6f1] p-4 text-sm leading-6">
            <p className="font-medium">图像生成 Prompt</p>
            <p className="mt-1 text-slate-600">{word.imagePrompt}</p>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button variant="outline">生成更夸张联想</Button>
            <Button variant="outline">生成中文谐音</Button>
            <Button variant="outline">生成词根记忆</Button>
            <Button variant="outline" onClick={onTogglePin}>
              {pinnedCount > 0 ? "取消钉住" : "钉住这张卡"}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function VisualScenePanel({
  word,
  imageSrc,
  imageStatus,
  onGenerateImage,
  large,
}: {
  word: Word;
  imageSrc?: string;
  imageStatus?: string;
  onGenerateImage?: () => void;
  large?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-slate-200 bg-[#f7f6f1] text-slate-950",
        large ? "min-h-80" : "min-h-64",
      )}
    >
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={`${word.word} visual memory`}
          className="h-full min-h-64 w-full object-cover"
        />
      ) : (
        <div className="flex h-full min-h-64 flex-col justify-between p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-md bg-white px-3 py-1 text-xs font-medium text-slate-600">
              {word.visualKeyword}
            </span>
            <Eye className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <p className="text-lg font-semibold leading-7 text-slate-950">
              {word.visualScene}
            </p>
            <Button
              className="mt-5 w-full gap-2"
              onClick={onGenerateImage}
              disabled={!onGenerateImage || imageStatus === "生成中..."}
            >
              <Sparkles className="h-4 w-4" />
              {imageStatus === "生成中..." ? "正在生成图片" : "替换为 AI 生成图"}
            </Button>
            {imageStatus && imageStatus !== "生成中..." && (
              <p className="mt-3 rounded-md bg-white px-3 py-2 text-xs leading-5 text-slate-600">
                {imageStatus}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RatingButtons({ onRate }: { onRate: (rating: Rating) => void }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {(Object.keys(ratingMeta) as Rating[]).map((rating) => (
        <Button
          key={rating}
          variant="outline"
          className={cn(
            "h-auto flex-col items-start rounded-md border px-4 py-3 text-left",
            ratingMeta[rating].className,
          )}
          onClick={() => onRate(rating)}
        >
          <span className="font-semibold">{ratingMeta[rating].label}</span>
          <span className="text-xs opacity-75">{ratingMeta[rating].note}</span>
        </Button>
      ))}
    </div>
  );
}

function SessionNav({
  canBack,
  canNext,
  onBack,
  onNext,
}: {
  canBack: boolean;
  canNext: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between rounded-md border border-slate-200 bg-white p-3">
      <Button variant="outline" onClick={onBack} disabled={!canBack}>
        上一词
      </Button>
      <p className="px-3 text-center text-xs text-slate-500">
        可以随时返回，不需要一次记完。
      </p>
      <Button variant="outline" onClick={onNext} disabled={!canNext}>
        下一词
      </Button>
    </div>
  );
}

function RecallSteps({ active }: { active: number }) {
  const steps = ["单词+中文", "图像+解析", "例句+同反义", "自评复习"];
  return (
    <div className="flex gap-2 overflow-x-auto rounded-md border border-slate-200 bg-white p-3">
      {steps.map((step, index) => (
        <span
          key={step}
          className={cn(
            "shrink-0 rounded-md px-3 py-1.5 text-xs",
            index + 1 <= active
              ? "bg-slate-950 text-white"
              : "bg-slate-100 text-slate-600",
          )}
        >
          {index + 1}. {step}
        </span>
      ))}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h1 className="text-xl font-semibold md:text-2xl">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white px-3 py-2">
      <span className="block text-xs text-slate-500">{label}</span>
      <span className="mt-1 block font-semibold">{value}</span>
    </div>
  );
}

function TaskRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-[#f7f6f1] px-3 py-2 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function DashboardPanel({
  icon: Icon,
  title,
  text,
  href,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <Icon className="h-6 w-6 text-slate-700" />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </Link>
  );
}

function GreMeaningBlock({ word }: { word: Word }) {
  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-[#f7f6f1] p-4">
      <p className="text-xs font-medium text-slate-500">
        GRE 常见中英文意思
      </p>
      <p className="mt-2 text-xl font-semibold leading-7 text-slate-950">
        {word.coreMeaningCn}
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-700">
        {word.coreMeaningEn}
      </p>
      {word.greMeanings.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {word.greMeanings.slice(0, 5).map((meaning) => (
            <Badge
              key={meaning}
              variant="outline"
              className="rounded-md bg-white text-slate-700"
            >
              {meaning}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-[#f7f6f1] p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 leading-6 text-slate-950">{value}</p>
    </div>
  );
}

function ChipBlock({
  label,
  items,
  compact,
}: {
  label: string;
  items: string[];
  compact?: boolean;
}) {
  const visibleItems = (items.length ? items : ["待补充"]).slice(
    0,
    compact ? 8 : 10,
  );
  const hiddenCount = Math.max(0, items.length - visibleItems.length);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {visibleItems.map((item) => (
          <Badge
            key={item}
            variant="outline"
            className="rounded-md bg-[#f7f6f1] text-slate-700"
          >
            {item}
          </Badge>
        ))}
        {hiddenCount > 0 && (
          <Badge variant="outline" className="rounded-md bg-white text-slate-500">
            +{hiddenCount}
          </Badge>
        )}
      </div>
    </div>
  );
}

function ComparisonBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 text-sm">
      <p className="font-medium">{label}</p>
      <p className="mt-2 leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function FieldRow({
  label,
  hint,
  control,
}: {
  label: string;
  hint: string;
  control: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Label>{label}</Label>
        <p className="mt-1 text-sm text-slate-600">{hint}</p>
      </div>
      {control}
    </div>
  );
}

function SwitchRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-200 p-4">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
  actionHref,
  actionText,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  actionHref: string;
  actionText: string;
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#f7f6f1] px-4">
      <section className="max-w-lg rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Icon className="mx-auto h-10 w-10 text-slate-700" />
        <h1 className="mt-5 text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-slate-600">{text}</p>
        <Button asChild className="mt-6">
          <Link href={actionHref}>{actionText}</Link>
        </Button>
      </section>
    </div>
  );
}

function exportWeakWordsToExcel(
  words: Word[],
  memoryByWord: Map<string, UserWordMemory>,
  notes: Record<string, string>,
) {
  const headers = [
    "word",
    "meaning_cn",
    "meaning_en",
    "synonyms",
    "antonyms",
    "wrong_count",
    "status",
    "next_review_at",
    "memory_note",
  ];

  const rows = words.map((word) => {
    const memory = memoryByWord.get(word.id) ?? fallbackMemory(word.id);
    return [
      word.word,
      word.coreMeaningCn,
      word.coreMeaningEn,
      word.synonyms.join(", "),
      word.antonyms.join(", "),
      String(memory.wrongCount),
      statusLabel[memory.status],
      memory.nextReviewAt ?? "",
      notes[word.id] ?? "",
    ];
  });

  const table = [headers, ...rows]
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td>${escapeHtml(cell)}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table>${table}</table></body></html>`;
  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gre-weak-words-${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fallbackMemory(wordId: string): UserWordMemory {
  return {
    wordId,
    status: "new",
    easeFactor: 2.5,
    intervalDays: 0,
    repetitionCount: 0,
    correctCount: 0,
    wrongCount: 0,
  };
}

function blankWordInSentence(sentence: string, word: string) {
  const pattern = new RegExp(word, "i");
  return sentence.replace(pattern, "______");
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}
