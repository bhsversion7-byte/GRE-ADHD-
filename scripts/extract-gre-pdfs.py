from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from openpyxl import Workbook
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "tmp" / "pdfs"
PUBLIC_DATA = ROOT / "public" / "data"
OUTPUT_DIR = ROOT / "output"
WECHAT_DIR = OUTPUT_DIR / "wechat"
FILL_ANSWERS_TXT = WECHAT_DIR / "fill-answers.txt"

ORIGINAL_PDF_DIR = Path(r"E:\GRE备考至尊版\⭐️一套完整的GRE词汇资料⭐️")
ORIGINAL_REAL_QUESTIONS_DIR = Path(r"E:\GRE备考至尊版\【26年GRE最新最全真题】")


def find_pdf(local_name: str, *fallbacks: Path) -> Path:
    local = PDF_DIR / local_name
    if local.exists():
        return local
    for fallback in fallbacks:
        if fallback.exists():
            return fallback
    return local


MAIN_PDF = find_pdf(
    "latest-3000-alpha.pdf",
    ORIGINAL_PDF_DIR / "最新3000词-正序版.pdf",
)
EQUIVALENT_PDF = find_pdf(
    "equivalent-900.pdf",
    ORIGINAL_PDF_DIR / "等价词900组.pdf",
)
SIMILAR_PDF = find_pdf(
    "similar-words.pdf",
    ORIGINAL_PDF_DIR / "重点形近词总结.pdf",
)
READING_PDF = find_pdf(
    "gre-reading-core.pdf",
    ORIGINAL_PDF_DIR / "GRE阅读核心词 .pdf",
)
FILL_PDF = find_pdf(
    "gre-fill-2000.pdf",
    ORIGINAL_REAL_QUESTIONS_DIR / "张巍GRE填空机经2000题.pdf",
)
READING_440_PDF = find_pdf(
    "gre-reading-440.pdf",
    ORIGINAL_REAL_QUESTIONS_DIR / "张巍GRE阅读机经440篇.pdf",
)

WORD_START = re.compile(r"(?P<word>[A-Za-z][A-Za-z ]{1,34})\s+\[(?P<phonetic>[^\]]{2,48})\]")
BAD_WORDS = {
    "GRE",
    "Day",
    "The",
    "This",
    "But",
    "In",
    "According",
    "Naylor",
    "Cross",
}


def read_pdf_text(path: Path, start_page: int = 0) -> str:
    reader = PdfReader(str(path))
    if reader.is_encrypted:
        reader.decrypt("")

    chunks: list[str] = []
    for page in reader.pages[start_page:]:
        try:
            chunks.append(page.extract_text() or "")
        except Exception:
            continue
    return normalize_text("\n".join(chunks))


def normalize_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"_®OáQlO.*?GRE", " ", text)
    text = re.sub(r"w ~Ï\s*GRE", " ", text)
    text = re.sub(r"第\s*\d+\s*页，共\s*\d+\s*页", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def read_pdf_text_with_lines(path: Path, start_page: int = 0) -> str:
    reader = PdfReader(str(path))
    if reader.is_encrypted:
        reader.decrypt("")

    chunks: list[str] = []
    for page in reader.pages[start_page:]:
        try:
            chunks.append((page.extract_text() or "").replace("\x00", ""))
        except Exception:
            continue
    return "\n".join(chunks)


def normalize_word(word: str) -> str:
    word = re.sub(r"\s+", "", word.strip())
    return word.lower()


def chinese_chunks(text: str) -> list[str]:
    return [
        chunk.strip(" ，。；;:：()（）")
        for chunk in re.findall(r"[\u4e00-\u9fff][\u4e00-\u9fff，；、的等\s]{0,28}", text)
        if len(chunk.strip()) >= 2
    ]


def split_list(value: str) -> list[str]:
    return [
        item.strip()
        for item in re.split(r"[,;，；、/]", value)
        if re.fullmatch(r"[A-Za-z][A-Za-z -]{1,28}", item.strip())
    ][:8]


def visual_hook(word: str, cn: str) -> tuple[str, str, str]:
    keyword = f"{word} memory scene"
    scene = f"把 {word} 变成一个和“{cn or '待补充'}”强绑定的夸张画面。"
    hook = f"先记画面，再回到 {word}：看到画面时立刻说出“{cn or '待补充释义'}”。"
    return keyword, scene, hook


def parse_main_words() -> dict[str, dict[str, Any]]:
    text = read_pdf_text(MAIN_PDF, start_page=4)
    matches = list(WORD_START.finditer(text))
    words: dict[str, dict[str, Any]] = {}

    for index, match in enumerate(matches):
        raw_word = match.group("word")
        word = normalize_word(raw_word)
        if word.upper() in BAD_WORDS or len(word) < 2 or len(word) > 28:
            continue

        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else start + 600
        segment = text[start:end]
        cn = chinese_chunks(segment)
        synonyms: list[str] = []
        syn_match = re.search(r"([\w\s,;-]{4,80})\s+例句", segment)
        if syn_match:
            synonyms = [item for item in split_list(syn_match.group(1)) if item != word]

        meaning_cn = cn[0] if cn else "待补充释义"
        visual_keyword, visual_scene, hook = visual_hook(word, meaning_cn)
        example = ""
        example_match = re.search(r"例句\s+(.{20,260}?)(?:[\u4e00-\u9fff]{2,}|$)", segment)
        if example_match:
            example = example_match.group(1).strip()

        words[word] = {
            "id": word,
            "word": word,
            "phonetic": f"[{match.group('phonetic').strip()}]",
            "coreMeaningCn": meaning_cn,
            "coreMeaningEn": "GRE meaning imported from local PDF",
            "greMeanings": [],
            "example": example or f"Create your own sentence for {word}.",
            "translation": "可在记忆区补充中文翻译。",
            "synonyms": synonyms,
            "antonyms": [],
            "roots": [],
            "affixes": [],
            "visualKeyword": visual_keyword,
            "visualScene": visual_scene,
            "imagePrompt": f"calm memorable GRE vocabulary illustration for {word}, meaning {meaning_cn}",
            "memoryHookCn": hook,
            "difficultyLevel": 3,
            "frequencyTag": "medium",
            "categoryTags": ["pdf-import", "latest-3000"],
            "source": "最新3000词-正序版.pdf",
        }

    return words


def parse_equivalent_groups() -> dict[str, list[str]]:
    if not EQUIVALENT_PDF.exists():
        return {}

    text = read_pdf_text(EQUIVALENT_PDF, start_page=4)
    groups: dict[str, list[str]] = {}
    row_pattern = re.compile(
        r"(?P<head>[a-z][a-z -]{2,24})\s+(?P<items>(?:[a-z][a-z -]{2,24},?\s*){1,8})\s+[\u4e00-\u9fff]"
    )
    for match in row_pattern.finditer(text):
        head = normalize_word(match.group("head"))
        items = [normalize_word(item) for item in split_list(match.group("items"))]
        if head and items:
            groups.setdefault(head, [])
            for item in items:
                if item != head and item not in groups[head]:
                    groups[head].append(item)
    return groups


def parse_similar_words() -> dict[str, str]:
    if not SIMILAR_PDF.exists():
        return {}

    text = read_pdf_text(SIMILAR_PDF, start_page=4)
    pairs: dict[str, str] = {}
    tokens = re.findall(r"\b[a-z][a-z]{3,24}\b\s+[\u4e00-\u9fff][\u4e00-\u9fff，、的]{0,18}", text)
    current_group: list[str] = []
    for token in tokens:
        word = token.split()[0]
        if word.isalpha():
            current_group.append(word)
        if len(current_group) >= 3:
            for item in current_group:
                others = [other for other in current_group if other != item]
                if others:
                    pairs[item] = ", ".join(others[:3])
            current_group = []
    return pairs


def parse_reading_words(existing: dict[str, dict[str, Any]]) -> None:
    if not READING_PDF.exists():
        return

    text = read_pdf_text(READING_PDF, start_page=0)
    for word in sorted(set(re.findall(r"\b[a-z][a-z]{3,24}\b", text))):
        if word in BAD_WORDS or word in existing:
            continue
        cn = "阅读核心词"
        visual_keyword, visual_scene, hook = visual_hook(word, cn)
        existing[word] = {
            "id": word,
            "word": word,
            "phonetic": "",
            "coreMeaningCn": cn,
            "coreMeaningEn": "GRE reading vocabulary imported from local PDF",
            "greMeanings": [],
            "example": f"Add a reading-context sentence for {word}.",
            "translation": "可在记忆区补充中文翻译。",
            "synonyms": [],
            "antonyms": [],
            "roots": [],
            "affixes": [],
            "visualKeyword": visual_keyword,
            "visualScene": visual_scene,
            "imagePrompt": f"calm GRE reading vocabulary illustration for {word}",
            "memoryHookCn": hook,
            "difficultyLevel": 3,
            "frequencyTag": "medium",
            "categoryTags": ["pdf-import", "reading-core"],
            "source": "GRE阅读核心词 .pdf",
        }


def clean_fill_text(text: str) -> str:
    text = text.replace("ﬂ", "fl").replace("ﬁ", "fi")
    text = re.sub(r"微信公众号：张巍GRE", " ", text)
    text = re.sub(r"第\s*\d+\s*⻚", " ", text)
    text = re.sub(r"第\s*⻚\d+", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def parse_choice_items(choices_text: str) -> list[dict[str, str]]:
    normalized = choices_text.replace(" .", ".")
    normalized = re.sub(r"([a-z])([A-I])\.", r"\1 \2.", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    items: list[dict[str, str]] = []
    seen_keys: set[str] = set()
    for match in re.finditer(
        r"\b([A-I])\.\s+(.+?)(?=\s+[A-I]\.\s+|$)",
        normalized,
    ):
        if match.group(1) in seen_keys:
            break
        value = re.sub(r"[^A-Za-z' -].*$", "", match.group(2)).strip(" .;:,")
        if re.fullmatch(r"[A-Za-z][A-Za-z' -]{1,42}", value):
            items.append({"key": match.group(1), "word": normalize_word(value)})
            seen_keys.add(match.group(1))
    return items


def build_blank_groups(prompt: str, choices: list[dict[str, str]]) -> tuple[str, list[dict[str, Any]]]:
    roman_labels = [
        label.lower()
        for label in re.findall(r"\((i|ii|iii)\)\s*_{2,}", prompt, flags=re.I)
    ]
    letter_groups = {
        "i": {"A", "B", "C"},
        "ii": {"D", "E", "F"},
        "iii": {"G", "H", "I"},
    }

    if roman_labels:
        expected_keys = set().union(
            *(letter_groups[label] for label in roman_labels if label in letter_groups)
        )
        choices = [choice for choice in choices if choice["key"] in expected_keys]
        blanks: list[dict[str, Any]] = []
        for label in roman_labels:
            group_choices = [
                choice for choice in choices if choice["key"] in letter_groups[label]
            ]
            if group_choices:
                blanks.append(
                    {
                        "id": label,
                        "label": f"({label})",
                        "choices": group_choices,
                        "requiredCount": 1,
                    }
                )
        if len(blanks) != len(roman_labels):
            return "multi-blank", []
        return "multi-blank", blanks

    if len(choices) == 6:
        choices = [choice for choice in choices if choice["key"] in set("ABCDEF")]
        return (
            "sentence-equivalence",
            [
                {
                    "id": "blank-1",
                    "label": "同义词等价空",
                    "choices": choices,
                    "requiredCount": 2,
                }
            ],
        )

    choices = [choice for choice in choices if choice["key"] in set("ABCDE")]
    return (
        "single-blank",
        [
            {
                "id": "blank-1",
                "label": "空格",
                "choices": choices,
                "requiredCount": 1,
            }
        ],
    )


def parse_fill_answer_key() -> dict[tuple[int, int, int], str]:
    if not FILL_ANSWERS_TXT.exists():
        return {}

    text = FILL_ANSWERS_TXT.read_text(encoding="utf-8", errors="ignore")
    answers: dict[tuple[int, int, int], str] = {}
    current_test = 0
    for raw_line in text.splitlines():
        line = raw_line.strip()
        test_match = re.search(r"\btest\s+(\d+)\b", line, flags=re.I)
        if test_match:
            current_test = int(test_match.group(1))
            continue
        section_match = re.search(
            r"\bsection\s+([12])\s+([A-I/ ]+)",
            line,
            flags=re.I,
        )
        if not current_test or not section_match:
            continue
        section = int(section_match.group(1))
        section_answers = [
            item.strip().upper()
            for item in section_match.group(2).strip("/ ").split("/")
            if item.strip()
        ]
        for index, answer in enumerate(section_answers[:7], start=1):
            answers[(current_test, section, index)] = answer
    return answers


def apply_answer_to_blanks(
    blanks: list[dict[str, Any]],
    answer: str | None,
) -> tuple[list[dict[str, Any]], bool]:
    if not answer:
        return blanks, False

    answer = re.sub(r"[^A-I]", "", answer.upper())
    if not answer:
        return blanks, False

    if len(blanks) == 1:
        blanks[0]["answerKeys"] = list(answer)
        return blanks, True

    for blank, key in zip(blanks, answer):
        blank["answerKeys"] = [key]
    return blanks, len(answer) >= len(blanks)


def answer_explanation(
    blanks: list[dict[str, Any]],
    answer: str | None,
) -> str:
    if not answer:
        return "这题暂未匹配到答案表。"

    parts: list[str] = []
    for blank in blanks:
        keys = blank.get("answerKeys", [])
        words = [
            choice["word"]
            for choice in blank.get("choices", [])
            if choice.get("key") in keys
        ]
        if words:
            parts.append(f"{blank.get('label', '空格')}：{' / '.join(keys)} = {', '.join(words)}")
    if not parts:
        return f"答案：{answer}。"
    return "答案来自张巍GRE填空机经答案表；" + "；".join(parts) + "。"


def iter_fill_question_records(text: str) -> list[dict[str, Any]]:
    section_markers = list(
        re.finditer(
            r"\btest\s+(\d+)\s+section\s+([12])\s*(?:\((easy|medium|hard)\))?",
            text,
            flags=re.I,
        )
    )
    records: list[dict[str, Any]] = []
    for marker_index, marker in enumerate(section_markers):
        test_number = int(marker.group(1))
        section_number = int(marker.group(2))
        start = marker.end()
        end = (
            section_markers[marker_index + 1].start()
            if marker_index + 1 < len(section_markers)
            else len(text)
        )
        section_text = text[start:end]
        question_matches = list(
            re.finditer(
                r"(?:^|\n)\s*([1-7])\.\s+(.+?)(?=\n\s*[1-7]\.\s+|$)",
                section_text,
                flags=re.S,
            )
        )
        for question_match in question_matches:
            records.append(
                {
                    "testNumber": test_number,
                    "sectionNumber": section_number,
                    "questionNumber": int(question_match.group(1)),
                    "block": question_match.group(2).strip(),
                }
            )
    return records


def parse_fill_questions(words: dict[str, dict[str, Any]]) -> int:
    if not FILL_PDF.exists():
        return 0

    text = clean_fill_text(read_pdf_text_with_lines(FILL_PDF, start_page=20))
    answer_key = parse_fill_answer_key()
    question_records = iter_fill_question_records(text)
    attached = 0
    seen_question_words: set[tuple[str, str]] = set()

    for record in question_records:
        block = record["block"]
        if "____" not in block:
            continue

        first_choice = re.search(r"\bA\.\s+", block)
        if not first_choice:
            continue

        prompt = re.sub(r"\s+", " ", block[: first_choice.start()]).strip()
        choices = parse_choice_items(block[first_choice.start() :])
        if len(choices) < 2:
            continue

        question_type, blanks = build_blank_groups(prompt, choices)
        if not blanks:
            continue

        raw_answer = answer_key.get(
            (
                record["testNumber"],
                record["sectionNumber"],
                record["questionNumber"],
            )
        )
        blanks, has_official_answer = apply_answer_to_blanks(blanks, raw_answer)
        flat_choices = [choice["word"] for choice in choices]
        question_id = f"{hash(prompt)}"
        for choice in flat_choices:
            item = words.get(choice)
            if not item:
                continue
            pair_key = (choice, question_id)
            if pair_key in seen_question_words or item.get("quizQuestion"):
                continue

            item["quizQuestion"] = {
                "prompt": prompt,
                "choices": flat_choices,
                "type": question_type,
                "blanks": blanks,
                "targetWord": choice,
                "hasOfficialAnswer": has_official_answer,
                "answer": raw_answer,
                "answerExplanation": answer_explanation(blanks, raw_answer),
                "testNumber": record["testNumber"],
                "sectionNumber": record["sectionNumber"],
                "questionNumber": record["questionNumber"],
                "source": "张巍GRE填空机经2000题.pdf",
            }
            if item.get("example", "").startswith("Create your own sentence"):
                item["example"] = prompt
                item["translation"] = "来自填空机经原题；答案已按微信答案表匹配。"
            tags = item.setdefault("categoryTags", [])
            if "fill-question" not in tags:
                tags.append("fill-question")
            seen_question_words.add(pair_key)
            attached += 1

    return attached


def parse_reading_440_context(words: dict[str, dict[str, Any]]) -> int:
    if not READING_440_PDF.exists():
        return 0

    text = read_pdf_text(READING_440_PDF, start_page=20)
    sentences = re.findall(r"[A-Z][^.?!]{35,260}[.?!]", text)
    word_set = set(words)
    attached = 0
    for sentence in sentences:
        lowered = set(re.findall(r"\b[a-z][a-z]{3,24}\b", sentence.lower()))
        for word in lowered & word_set:
            item = words[word]
            if item.get("example") and not item["example"].startswith("Create your own sentence"):
                continue
            item["example"] = sentence.strip()
            item["translation"] = "来自阅读机经上下文；可在记忆区补充中文解析。"
            tags = item.setdefault("categoryTags", [])
            if "reading-context" not in tags:
                tags.append("reading-context")
            attached += 1
        if attached >= 1200:
            break
    return attached


def enrich_with_wordnet(words: dict[str, dict[str, Any]]) -> dict[str, int]:
    try:
        import nltk
        from nltk.corpus import wordnet as wn
    except Exception:
        return {"synonyms": 0, "antonyms": 0}

    try:
        wn.synsets("aberrant")
    except LookupError:
        nltk.download("wordnet", quiet=True)
        nltk.download("omw-1.4", quiet=True)

    synonym_adds = 0
    antonym_adds = 0

    for word, item in words.items():
        synonyms = list(dict.fromkeys(item.get("synonyms", [])))
        antonyms = list(dict.fromkeys(item.get("antonyms", [])))

        for synset in wn.synsets(word):
            for lemma in synset.lemmas():
                lemma_name = lemma.name().replace("_", " ").lower()
                if (
                    lemma_name != word
                    and re.fullmatch(r"[a-z][a-z -]{2,30}", lemma_name)
                    and lemma_name not in synonyms
                ):
                    synonyms.append(lemma_name)
                    synonym_adds += 1
                for antonym in lemma.antonyms():
                    antonym_name = antonym.name().replace("_", " ").lower()
                    if (
                        antonym_name != word
                        and re.fullmatch(r"[a-z][a-z -]{2,30}", antonym_name)
                        and antonym_name not in antonyms
                    ):
                        antonyms.append(antonym_name)
                        antonym_adds += 1

        item["synonyms"] = synonyms[:10]
        item["antonyms"] = antonyms[:10]
        if synonyms or antonyms:
            tags = item.setdefault("categoryTags", [])
            if "wordnet-enriched" not in tags:
                tags.append("wordnet-enriched")

    return {"synonyms": synonym_adds, "antonyms": antonym_adds}


def write_outputs(words: list[dict[str, Any]]) -> None:
    PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    json_path = PUBLIC_DATA / "gre-vocab-extracted.local.json"
    json_path.write_text(json.dumps(words, ensure_ascii=False, indent=2), encoding="utf-8")

    wb = Workbook()
    ws = wb.active
    ws.title = "GRE words"
    headers = [
        "word",
        "phonetic",
        "coreMeaningCn",
        "coreMeaningEn",
        "synonyms",
        "confusingWith",
        "source",
    ]
    ws.append(headers)
    for word in words:
        ws.append(
            [
                word.get("word", ""),
                word.get("phonetic", ""),
                word.get("coreMeaningCn", ""),
                word.get("coreMeaningEn", ""),
                ", ".join(word.get("synonyms", [])),
                word.get("confusingWith", ""),
                word.get("source", ""),
            ]
        )
    wb.save(OUTPUT_DIR / "gre-vocab-extracted.xlsx")


def main() -> None:
    words = parse_main_words()
    equivalents = parse_equivalent_groups()
    similar = parse_similar_words()
    parse_reading_words(words)
    fill_count = parse_fill_questions(words)
    reading_count = parse_reading_440_context(words)
    wordnet_count = enrich_with_wordnet(words)

    for word, item in words.items():
        syns = item.get("synonyms", [])
        for synonym in equivalents.get(word, []):
            if synonym not in syns:
                syns.append(synonym)
        item["synonyms"] = syns[:10]
        if word in similar:
            item["confusingWith"] = similar[word]
            tags = item.setdefault("categoryTags", [])
            if "confusing" not in tags:
                tags.append("confusing")

    result = sorted(words.values(), key=lambda item: item["word"])
    write_outputs(result)
    print(json.dumps({"words": len(result), "fill_questions": fill_count, "reading_examples": reading_count, "wordnet": wordnet_count, "json": "public/data/gre-vocab-extracted.local.json", "xlsx": "output/gre-vocab-extracted.xlsx"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
