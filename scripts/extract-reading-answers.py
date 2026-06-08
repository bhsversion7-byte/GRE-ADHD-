from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
WECHAT_DIR = ROOT / "output" / "wechat"
READING_ANSWERS_TXT = WECHAT_DIR / "reading-answers.txt"
PUBLIC_DATA = ROOT / "public" / "data"


def normalize_answer_text(value: str) -> str:
    value = value.replace("\u00a0", " ")
    value = re.sub(r"锛堟柊棰橈級|（新题）", " ", value)
    value = re.sub(r"</?span>", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip(" ：:;；")


def answer_tokens(value: str) -> list[str]:
    cleaned = normalize_answer_text(value)
    return [
        token
        for token in re.findall(r"\b[A-E]{1,3}\b|第[一二三四五六七八九十]+[句段]", cleaned)
        if token
    ]


def main() -> None:
    if not READING_ANSWERS_TXT.exists():
        raise SystemExit("output/wechat/reading-answers.txt not found")

    text = READING_ANSWERS_TXT.read_text(encoding="utf-8", errors="ignore")
    pattern = re.compile(
        r"PASSA?GE\s*([0-9]{1,3})\s*\n(.+?)(?=\nPASSA?GE\s*[0-9]{1,3}\s*\n|$)",
        flags=re.I | re.S,
    )
    rows: list[dict[str, Any]] = []
    for match in pattern.finditer(text):
        passage = int(match.group(1))
        raw = normalize_answer_text(match.group(2))
        if not raw:
            continue
        rows.append(
            {
                "passage": passage,
                "rawAnswer": raw,
                "answers": answer_tokens(raw),
                "source": "张巍GRE阅读机经440篇答案微信文章",
            }
        )

    PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
    out = PUBLIC_DATA / "gre-reading-answers.local.json"
    out.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"passages": len(rows), "json": str(out)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
