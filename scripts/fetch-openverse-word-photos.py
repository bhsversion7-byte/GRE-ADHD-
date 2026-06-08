#!/usr/bin/env python3
"""Download open-license word images from Openverse into public assets.

The script stores attribution metadata in public/asset/word-photos/manifest.json
and writes image_url/image_attribution back into the local vocabulary JSON.
"""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
VOCAB_PATH = ROOT / "public" / "data" / "gre-vocab-extracted.local.json"
OUT_DIR = ROOT / "public" / "asset" / "word-photos"
MANIFEST_PATH = OUT_DIR / "manifest.json"
API = "https://api.openverse.engineering/v1/images/"
USER_AGENT = "GRE-ADHD-visual-memory/0.1 educational open-license-image-fetcher"
ALLOWED_LICENSES = {"cc0", "pdm", "by", "by-sa"}
BAD_QUERIES = {"from", "to", "of", "and", "or", "meaning pending", "photo"}
PRIORITY_WORDS = [
    "aback",
    "abandon",
    "abase",
    "abash",
    "abate",
    "aberration",
    "ablaze",
    "abrade",
    "enervate",
    "austere",
    "prodigal",
    "laconic",
    "exalt",
    "valorize",
]
QUERY_OVERRIDES = {
    "aback": ["surprised person", "startled face", "shock expression"],
    "abandon": ["abandoned house", "empty road", "deserted place"],
    "abase": ["humiliation person", "person looking ashamed"],
    "abash": ["embarrassed person", "shy embarrassed face"],
    "abate": ["calm water after storm", "receding flood", "quiet storm clouds"],
    "aberration": ["odd one out", "single object out of line"],
    "ablaze": ["flames fire", "burning torch", "campfire flames"],
    "abrade": ["scratched surface", "rough stone texture", "worn metal texture"],
    "enervate": ["tired exhausted person", "weak tired person", "drained energy"],
    "austere": ["empty room", "minimal room", "plain concrete wall"],
    "prodigal": ["scattered money", "spending money", "coins on table"],
    "laconic": ["closed mouth", "short note", "minimal text"],
    "exalt": ["raised hands celebration", "praise celebration"],
    "valorize": ["trophy praise", "medal award", "celebration award"],
}


def load_json(path: Path, fallback: Any) -> Any:
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data: Any) -> None:
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def clean_words(text: str) -> str:
    text = re.sub(r"[^A-Za-z0-9,; /-]+", " ", text or "")
    text = re.sub(r"\b(GRE|meaning|imported|local|PDF|memory|scene|visual)\b", " ", text, flags=re.I)
    return re.sub(r"\s+", " ", text).strip()


def split_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if not value:
        return []
    return [part.strip() for part in re.split(r"[,;/|]+", str(value)) if part.strip()]


def build_query(word: dict[str, Any]) -> str:
    core = clean_words(str(word.get("coreMeaningEn") or word.get("core_meaning_en") or ""))
    visual = clean_words(str(word.get("visualKeyword") or word.get("visual_keyword") or ""))
    synonyms = " ".join(split_list(word.get("synonyms"))[:2])
    query = " ".join(part for part in [visual, core, synonyms, "photo"] if part)
    query = re.sub(r"\s+", " ", query).strip()
    if len(query) < 4:
        query = f"{word.get('word', '')} concept photo"
    return query[:120]


def build_queries(word: dict[str, Any]) -> list[str]:
    word_id = str(word.get("id") or word.get("word") or "").lower()
    base = [
        *QUERY_OVERRIDES.get(word_id, []),
        build_query(word),
        clean_words(str(word.get("coreMeaningEn") or word.get("core_meaning_en") or "")),
        clean_words(str(word.get("visualKeyword") or word.get("visual_keyword") or "")),
        " ".join(split_list(word.get("synonyms"))[:3]),
        str(word.get("word") or ""),
    ]
    queries: list[str] = []
    seen: set[str] = set()
    for item in base:
        query = re.sub(r"\s+", " ", item).strip()
        if (
            len(query) >= 3
            and query.lower() not in seen
            and query.lower() not in BAD_QUERIES
        ):
            queries.append(query[:120])
            seen.add(query.lower())
    return queries


def request_json(url: str) -> dict[str, Any]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=25) as response:
        return json.load(response)


def download(url: str, target: Path) -> bool:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            content_type = response.headers.get("Content-Type", "")
            body = response.read()
        if len(body) < 1024 or "image" not in content_type.lower():
            return False
        target.write_bytes(body)
        return True
    except Exception:
        return False


def search_image(query: str) -> dict[str, Any] | None:
    params = {
        "q": query,
        "page_size": "8",
        "license": ",".join(sorted(ALLOWED_LICENSES)),
        "mature": "false",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    data = request_json(url)
    for item in data.get("results", []):
        license_code = str(item.get("license") or "").lower()
        if license_code not in ALLOWED_LICENSES:
            continue
        if item.get("thumbnail") or item.get("url"):
            return item
    return None


def select_words(words: list[dict[str, Any]], limit: int, explicit: list[str]) -> list[dict[str, Any]]:
    by_id = {str(word.get("id") or word.get("word")).lower(): word for word in words}
    selected: list[dict[str, Any]] = []
    seen: set[str] = set()

    for item in explicit + PRIORITY_WORDS:
        key = item.lower()
        if key in by_id and key not in seen:
            selected.append(by_id[key])
            seen.add(key)

    for word in words:
        key = str(word.get("id") or word.get("word")).lower()
        if key not in seen:
            selected.append(word)
            seen.add(key)
        if len(selected) >= limit:
            break
    return selected


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=180)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--words", nargs="*", default=[])
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    words = load_json(VOCAB_PATH, [])
    manifest = load_json(MANIFEST_PATH, {})
    selected = select_words(words, args.limit, args.words)

    downloaded = 0
    skipped = 0
    failed = 0

    for index, word in enumerate(selected, start=1):
        word_id = str(word.get("id") or word.get("word")).lower()
        target = OUT_DIR / f"w-{word_id}.jpg"
        if target.exists() and not args.force:
            word["image_url"] = f"/asset/word-photos/{target.name}"
            if word_id not in manifest:
                manifest[word_id] = {
                    "word": word.get("word"),
                    "query": build_query(word),
                    "image_url": word["image_url"],
                    "source": "existing local file",
                }
            save_json(VOCAB_PATH, words)
            save_json(MANIFEST_PATH, manifest)
            skipped += 1
            continue

        queries = build_queries(word)
        try:
            item = None
            query = queries[0] if queries else str(word.get("word") or word_id)
            for candidate_query in queries:
                query = candidate_query
                item = search_image(candidate_query)
                if item:
                    break
            if not item:
                failed += 1
                print(f"[{index}/{len(selected)}] no result: {word_id} :: {' | '.join(queries[:4])}")
                continue

            source_url = item.get("thumbnail") or item.get("url")
            if not source_url or not download(str(source_url), target):
                fallback_url = item.get("url")
                if not fallback_url or not download(str(fallback_url), target):
                    failed += 1
                    print(f"[{index}/{len(selected)}] download failed: {word_id}")
                    continue

            local_url = f"/asset/word-photos/{target.name}"
            attribution = {
                "word": word.get("word"),
                "query": query,
                "title": item.get("title"),
                "creator": item.get("creator"),
                "license": item.get("license"),
                "license_version": item.get("license_version"),
                "source": item.get("foreign_landing_url"),
                "provider": item.get("provider"),
                "openverse_id": item.get("id"),
                "image_url": local_url,
            }
            manifest[word_id] = attribution
            word["image_url"] = local_url
            word["image_attribution"] = attribution
            save_json(VOCAB_PATH, words)
            save_json(MANIFEST_PATH, manifest)
            downloaded += 1
            print(f"[{index}/{len(selected)}] downloaded: {word_id} :: {query}")
            time.sleep(0.25)
        except Exception as exc:
            failed += 1
            print(f"[{index}/{len(selected)}] failed: {word_id} :: {exc}")
            time.sleep(0.5)

    save_json(VOCAB_PATH, words)
    save_json(MANIFEST_PATH, manifest)
    print(f"done downloaded={downloaded} skipped={skipped} failed={failed}")


if __name__ == "__main__":
    main()
