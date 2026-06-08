from __future__ import annotations

import html
import json
import re
from pathlib import Path
from textwrap import wrap


ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "public" / "data" / "gre-vocab-extracted.local.json"
OUT_DIR = ROOT / "public" / "asset" / "word-images"
MANIFEST_FILE = OUT_DIR / "manifest.json"


PALETTES = [
    ("#dff4ef", "#f8f6ed", "#0f172a", "#0f766e"),
    ("#e8f0ff", "#f7f6f1", "#111827", "#2563eb"),
    ("#fff2d8", "#f8fafc", "#1f2937", "#b45309"),
    ("#f0e7ff", "#f8f6ed", "#111827", "#7c3aed"),
    ("#e9f8dd", "#fffaf0", "#172554", "#15803d"),
    ("#ffe7ec", "#f8fafc", "#111827", "#be123c"),
]

SEED_WORDS = [
    {
        "id": "aberrant",
        "word": "aberrant",
        "coreMeaningCn": "异常的，偏离常规的",
        "visualKeyword": "wrong-way ant",
        "visualScene": "A tiny ant leaves a straight marching line and walks toward a glowing wrong-way sign.",
        "memoryHookCn": "aberrant = a + err + ant，一只走错路的 ant，偏离正常路线。",
    },
    {
        "id": "laconic",
        "word": "laconic",
        "coreMeaningCn": "简洁的，话少的",
        "visualKeyword": "zipped mouth",
        "visualScene": "A person with a zipped mouth calmly holds a small card that says OK.",
        "memoryHookCn": "laconic 像 lack + sonic，缺少声音，所以话很少。",
    },
    {
        "id": "prodigal",
        "word": "prodigal",
        "coreMeaningCn": "挥霍的，浪费的",
        "visualKeyword": "coins waterfall",
        "visualScene": "A wallet pours coins like a waterfall while a small timer keeps ticking.",
        "memoryHookCn": "把金币当项目乱扔，就是挥霍。",
    },
    {
        "id": "enervate",
        "word": "enervate",
        "coreMeaningCn": "使衰弱，使无力",
        "visualKeyword": "empty battery",
        "visualScene": "A bright battery slowly fades to pale gray while a runner sits down gently.",
        "memoryHookCn": "nerve 被抽空，整个人就无力了。",
    },
    {
        "id": "obdurate",
        "word": "obdurate",
        "coreMeaningCn": "顽固的，执拗的",
        "visualKeyword": "stone door",
        "visualScene": "A stone door refuses to open while gentle keys bounce off its surface.",
        "memoryHookCn": "dur 表示硬，像硬石门一样劝不开。",
    },
    {
        "id": "ephemeral",
        "word": "ephemeral",
        "coreMeaningCn": "短暂的，转瞬即逝的",
        "visualKeyword": "soap bubble",
        "visualScene": "A soap bubble reflects a whole city for one second before it disappears.",
        "memoryHookCn": "像一封 email 烟花，看见一下就消失。",
    },
    {
        "id": "garrulous",
        "word": "garrulous",
        "coreMeaningCn": "喋喋不休的",
        "visualKeyword": "word waterfall",
        "visualScene": "Words pour from a smiling speaker like a waterfall into a small teacup.",
        "memoryHookCn": "咕噜咕噜，话一直冒出来。",
    },
    {
        "id": "ameliorate",
        "word": "ameliorate",
        "coreMeaningCn": "改善，改良",
        "visualKeyword": "repairing ladder",
        "visualScene": "A ladder repairs itself step by step, letting someone climb out of a pit.",
        "memoryHookCn": "melior 表示 better，让情况 better。",
    },
    {
        "id": "esoteric",
        "word": "esoteric",
        "coreMeaningCn": "深奥的，小圈子才懂的",
        "visualKeyword": "locked tiny library",
        "visualScene": "A small library inside a glass box has a key held by only three readers.",
        "memoryHookCn": "知识藏在里面，只有少数人进得去。",
    },
    {
        "id": "capricious",
        "word": "capricious",
        "coreMeaningCn": "反复无常的",
        "visualKeyword": "weather hat",
        "visualScene": "A hat changes from sun to rain to snow while sitting on one person's head.",
        "memoryHookCn": "cap 一直换，帽子天气不断变。",
    },
    {
        "id": "mollify",
        "word": "mollify",
        "coreMeaningCn": "安抚，缓和",
        "visualKeyword": "soft blanket",
        "visualScene": "A sharp red alarm is wrapped in a soft green blanket and becomes quiet.",
        "memoryHookCn": "moll 表示 soft，把怒气变 soft。",
    },
]


def safe_id(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9_-]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or "word"


def text_lines(value: str, width: int, max_lines: int) -> list[str]:
    value = re.sub(r"\s+", " ", value or "").strip()
    if not value:
        return []
    lines = wrap(value, width=width, break_long_words=False, replace_whitespace=False)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip(". ") + "..."
    return lines


def svg_text(lines: list[str], x: int, y: int, size: int, fill: str, weight: int = 500, line_gap: int = 42) -> str:
    rows = []
    for index, line in enumerate(lines):
        rows.append(
            f'<text x="{x}" y="{y + index * line_gap}" font-size="{size}" '
            f'font-weight="{weight}" fill="{fill}">{html.escape(line)}</text>'
        )
    return "\n".join(rows)


def build_svg(word: dict, index: int) -> str:
    bg1, bg2, ink, accent = PALETTES[index % len(PALETTES)]
    word_text = html.escape(str(word.get("word") or "word"))
    meaning = str(word.get("coreMeaningCn") or word.get("coreMeaningEn") or "")
    keyword = str(word.get("visualKeyword") or f"{word_text} memory scene")
    scene = str(word.get("visualScene") or word.get("imagePrompt") or "")
    hook = str(word.get("memoryHookCn") or "")
    scene_lines = text_lines(scene, 46, 4)
    meaning_lines = text_lines(meaning, 22, 2)
    hook_lines = text_lines(hook, 42, 3)
    keyword_label = html.escape(keyword[:72])

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="{word_text} GRE visual memory card">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{bg1}"/>
      <stop offset="100%" stop-color="{bg2}"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.12"/>
    </filter>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)"/>
  <rect x="76" y="72" width="1048" height="756" rx="34" fill="#ffffff" opacity="0.68" filter="url(#softShadow)"/>
  <rect x="110" y="108" width="250" height="46" rx="14" fill="#ffffff" opacity="0.86"/>
  <text x="132" y="138" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" fill="{accent}">GRE visual cue</text>
  <text x="110" y="260" font-family="Inter, Arial, sans-serif" font-size="96" font-weight="800" fill="{ink}">{word_text}</text>
  <rect x="112" y="304" width="420" height="92" rx="20" fill="{bg1}" opacity="0.9"/>
  {svg_text(meaning_lines, 136, 350, 30, ink, 700, 36)}
  <rect x="112" y="448" width="976" height="194" rx="26" fill="#ffffff" opacity="0.74"/>
  <text x="140" y="500" font-family="Inter, Arial, sans-serif" font-size="25" font-weight="800" fill="{accent}">{keyword_label}</text>
  {svg_text(scene_lines, 140, 552, 34, ink, 750, 44)}
  <rect x="112" y="692" width="976" height="96" rx="22" fill="{bg2}" opacity="0.92"/>
  {svg_text(hook_lines or ["Memory hook: connect the visual first, then recall the word."], 140, 734, 24, ink, 650, 32)}
  <circle cx="965" cy="207" r="82" fill="{accent}" opacity="0.14"/>
  <path d="M920 208 C948 166 995 166 1020 205 C994 248 948 248 920 208Z" fill="none" stroke="{accent}" stroke-width="16" stroke-linecap="round"/>
  <circle cx="985" cy="208" r="18" fill="{accent}"/>
  <text x="110" y="830" font-family="Inter, Arial, sans-serif" font-size="18" fill="#64748b">local asset · no API generation</text>
</svg>
"""


def main() -> None:
    words = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    existing_ids = {safe_id(str(word.get("id") or word.get("word") or "")) for word in words}
    words.extend([word for word in SEED_WORDS if safe_id(word["id"]) not in existing_ids])
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, str] = {}
    for index, word in enumerate(words):
        word_id = safe_id(str(word.get("id") or word.get("word") or index))
        path = OUT_DIR / f"w-{word_id}.svg"
        path.write_text(build_svg(word, index), encoding="utf-8")
        manifest[word_id] = f"/asset/word-images/w-{word_id}.svg"
    MANIFEST_FILE.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"count": len(manifest), "dir": str(OUT_DIR)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
