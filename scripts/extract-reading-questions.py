from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DATA = ROOT / "public" / "data"
WECHAT_DIR = ROOT / "output" / "wechat"
READING_ANSWERS_TXT = WECHAT_DIR / "reading-answers.txt"
READING_PDF = Path(r"E:\GRE备考至尊版\【26年GRE最新最全真题】\张巍GRE阅读机经440篇.pdf")


def clean_pdf_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = text.replace(" ", "\n").replace("\ufb02", "fl").replace("\ufb01", "fi")
    text = re.sub(r"微信公众号：张巍\s*GRE", " ", text)
    text = re.sub(r"微信公众号：张巍GRE", " ", text)
    text = re.sub(r"第\s*⻚?\s*\d+", " ", text)
    text = re.sub(r"【[^】]*】", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def read_body_text() -> str:
    reader = PdfReader(str(READING_PDF))
    if reader.is_encrypted:
        reader.decrypt("")
    pages = []
    # Page 22 in 1-based numbering is the first real passage page.
    for page in reader.pages[21:]:
        try:
            pages.append(page.extract_text() or "")
        except Exception:
            continue
    return clean_pdf_text("\n".join(pages))


def normalize_answer_text(value: str) -> str:
    value = value.replace("\u00a0", " ")
    value = re.sub(r"锛堟柊棰橈級|（新题）", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip(" ：:;；")


def parse_reading_answers() -> dict[int, list[str]]:
    text = READING_ANSWERS_TXT.read_text(encoding="utf-8", errors="ignore")
    pattern = re.compile(
        r"PASSA?GE\s*([0-9]{1,3})\s*\n(.+?)(?=\nPASSA?GE\s*[0-9]{1,3}\s*\n|$)",
        flags=re.I | re.S,
    )
    answer_map: dict[int, list[str]] = {}
    for match in pattern.finditer(text):
        passage = int(match.group(1))
        raw = normalize_answer_text(match.group(2))
        tokens = re.findall(r"\b[A-E]{1,3}\b|第[一二三四五六七八九十]+[句段]", raw)
        if tokens:
            answer_map[passage] = tokens
        elif raw:
            answer_map[passage] = [raw]
    return answer_map


def parse_choices(block: str) -> list[dict[str, str]]:
    normalized = re.sub(r"\s+", " ", block)
    choices: list[dict[str, str]] = []
    for match in re.finditer(r"\b([A-E])\.\s+(.+?)(?=\s+[A-E]\.\s+|$)", normalized):
        text = match.group(2).strip()
        text = re.sub(r"\s+", " ", text).strip()
        if len(text) > 2:
            choices.append({"key": match.group(1), "text": text})
    return choices


def split_single_question_block(before_choices: str) -> tuple[str, str]:
    lines = [line.strip() for line in before_choices.splitlines() if line.strip()]
    question_starts = (
        "Which ",
        "The argument",
        "It can be inferred",
        "It can be concluded",
        "The passage",
        "The author",
        "The primary purpose",
        "According to",
        "The information",
        "The statement",
        "The claim",
        "Based on",
    )
    start_index = -1
    for index, line in enumerate(lines):
        if line.startswith(question_starts):
            start_index = index
    if start_index >= 0:
        passage_text = " ".join(lines[:start_index]).strip()
        stem = " ".join(lines[start_index:]).strip()
        return passage_text, stem
    normalized = re.sub(r"\s+", " ", before_choices).strip()
    return normalized, "Question"


def parse_passages(text: str) -> list[dict[str, Any]]:
    markers = list(re.finditer(r"(?:^|\n)\s*Passage\s+(\d{1,3})\s*(?:\n|$)", text, re.I))
    answer_map = parse_reading_answers()
    rows: list[dict[str, Any]] = []

    for index, marker in enumerate(markers):
        passage_no = int(marker.group(1))
        start = marker.end()
        end = markers[index + 1].start() if index + 1 < len(markers) else len(text)
        block = text[start:end].strip()
        q_match = re.search(r"(?:^|\n)\s*1\.\s+", block)
        if not q_match:
            first_choice = re.search(r"(?:^|\n|\s)A\.\s+", block)
            if not first_choice:
                continue
            passage_text, stem = split_single_question_block(block[: first_choice.start()])
            answers = answer_map.get(passage_no, [])
            answer = answers[0] if answers else ""
            rows.append(
                {
                    "passage": passage_no,
                    "text": re.sub(r"\s+", " ", passage_text).strip(),
                    "questions": [
                        {
                            "number": 1,
                            "stem": re.sub(r"\s+", " ", stem).strip(),
                            "choices": parse_choices(block[first_choice.start():]),
                            "answer": answer,
                            "answerKeys": list(answer) if re.fullmatch(r"[A-E]{1,3}", answer) else [],
                        }
                    ],
                    "rawAnswers": answers,
                    "source": "寮犲穽GRE闃呰鏈虹粡440绡?pdf",
                }
            )
            continue

        passage_text = re.sub(r"\s+", " ", block[: q_match.start()]).strip()
        question_text = block[q_match.start():].strip()
        q_markers = list(re.finditer(r"(?:^|\n)\s*(\d{1,2})\.\s+", question_text))
        questions: list[dict[str, Any]] = []
        answers = answer_map.get(passage_no, [])

        for q_index, q_marker in enumerate(q_markers):
            question_no = int(q_marker.group(1))
            q_start = q_marker.end()
            q_end = q_markers[q_index + 1].start() if q_index + 1 < len(q_markers) else len(question_text)
            q_block = question_text[q_start:q_end].strip()
            first_choice = re.search(r"(?:^|\n|\s)A\.\s+", q_block)
            if first_choice:
                stem = re.sub(r"\s+", " ", q_block[: first_choice.start()]).strip()
                choices = parse_choices(q_block[first_choice.start():])
            else:
                stem = re.sub(r"\s+", " ", q_block).strip()
                choices = []
            answer = answers[q_index] if q_index < len(answers) else ""
            questions.append(
                {
                    "number": question_no,
                    "stem": stem,
                    "choices": choices,
                    "answer": answer,
                    "answerKeys": list(answer) if re.fullmatch(r"[A-E]{1,3}", answer) else [],
                }
            )

        rows.append(
            {
                "passage": passage_no,
                "text": passage_text,
                "questions": questions,
                "rawAnswers": answers,
                "source": "张巍GRE阅读机经440篇.pdf",
            }
        )

    return rows


def main() -> None:
    rows = parse_passages(read_body_text())
    PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
    out = PUBLIC_DATA / "gre-reading-questions.local.json"
    out.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "passages": len(rows),
                "questions": sum(len(row["questions"]) for row in rows),
                "with_auto_answers": sum(
                    1
                    for row in rows
                    for question in row["questions"]
                    if question.get("answerKeys")
                ),
                "json": str(out),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
