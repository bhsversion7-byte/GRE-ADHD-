from __future__ import annotations

import json
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any
from urllib.parse import quote
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "public" / "data" / "gre-vocab-extracted.local.json"
CACHE_PATH = ROOT / "output" / "datamuse-cache.json"


def normalize_item(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def valid_related_word(value: str) -> bool:
    return bool(re.fullmatch(r"[a-z][a-z' -]{2,34}", value))


def load_cache() -> dict[str, Any]:
    if CACHE_PATH.exists():
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    return {}


def save_cache(cache: dict[str, Any]) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


def fetch_datamuse(word: str, relation: str, max_items: int = 20) -> list[str]:
    url = f"https://api.datamuse.com/words?rel_{relation}={quote(word)}&max={max_items}"
    with urlopen(url, timeout=12) as response:
        payload = json.loads(response.read().decode("utf-8"))
    return [
        normalize_item(item.get("word", ""))
        for item in payload
        if valid_related_word(normalize_item(item.get("word", "")))
    ]


cache_lock = threading.Lock()


def enrich_one(word: str, cache: dict[str, Any]) -> tuple[str, dict[str, list[str]]]:
    cached = cache.get(word)
    if cached:
        return word, cached

    result = {"synonyms": [], "antonyms": []}
    for relation, target_key in [("syn", "synonyms"), ("ant", "antonyms")]:
        try:
            result[target_key] = fetch_datamuse(word, relation)
            time.sleep(0.02)
        except Exception:
            result[target_key] = []
    with cache_lock:
        cache[word] = result
    return word, result


def merge_unique(existing: list[str], incoming: list[str], word: str, limit: int) -> list[str]:
    merged: list[str] = []
    for item in [*existing, *incoming]:
        item = normalize_item(item)
        if item != word and valid_related_word(item) and item not in merged:
            merged.append(item)
    return merged[:limit]


def main() -> None:
    words = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    cache = load_cache()
    targets = [
        item["word"]
        for item in words
        if len(item.get("synonyms", [])) < 6 or len(item.get("antonyms", [])) == 0
    ]

    updates: dict[str, dict[str, list[str]]] = {}
    completed = 0
    with ThreadPoolExecutor(max_workers=48) as executor:
        futures = [executor.submit(enrich_one, word, cache) for word in targets]
        for future in as_completed(futures):
            word, result = future.result()
            updates[word] = result
            completed += 1
            if completed % 100 == 0:
                save_cache(cache)

    synonym_adds = 0
    antonym_adds = 0
    for item in words:
        word = item["word"]
        update = updates.get(word) or cache.get(word) or {}
        old_synonyms = item.get("synonyms", [])
        old_antonyms = item.get("antonyms", [])
        item["synonyms"] = merge_unique(
            old_synonyms,
            update.get("synonyms", []),
            word,
            12,
        )
        item["antonyms"] = merge_unique(
            old_antonyms,
            update.get("antonyms", []),
            word,
            12,
        )
        synonym_adds += max(0, len(item["synonyms"]) - len(old_synonyms))
        antonym_adds += max(0, len(item["antonyms"]) - len(old_antonyms))
        if update.get("synonyms") or update.get("antonyms"):
            tags = item.setdefault("categoryTags", [])
            if "datamuse-enriched" not in tags:
                tags.append("datamuse-enriched")

    DATA_PATH.write_text(json.dumps(words, ensure_ascii=False, indent=2), encoding="utf-8")
    save_cache(cache)
    print(
        json.dumps(
            {
                "words": len(words),
                "queried": len(targets),
                "synonym_adds": synonym_adds,
                "antonym_adds": antonym_adds,
                "words_with_synonyms": sum(1 for item in words if item.get("synonyms")),
                "words_with_antonyms": sum(1 for item in words if item.get("antonyms")),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
