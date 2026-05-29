from __future__ import annotations

import re
from pathlib import Path


def normalize_relpath(value: str) -> str:
    cleaned = str(value).replace("\\", "/").strip().strip("/")
    if cleaned in {"", "."}:
        return ""
    while "//" in cleaned:
        cleaned = cleaned.replace("//", "/")
    return cleaned


def is_relative_path_safe(relative_path: str) -> bool:
    normalized = normalize_relpath(relative_path)
    if not normalized:
        return False
    parts = normalized.split("/")
    return not any(part in {"..", ""} for part in parts)


def path_is_within_prefixes(relative_path: str, prefixes: list[str]) -> bool:
    normalized = normalize_relpath(relative_path)
    for prefix in prefixes:
        normalized_prefix = normalize_relpath(prefix)
        if normalized == normalized_prefix or normalized.startswith(f"{normalized_prefix}/"):
            return True
    return False


def safe_join(base_dir: Path, relative_path: str) -> Path:
    normalized = normalize_relpath(relative_path)
    if not is_relative_path_safe(normalized):
        raise ValueError(f"非法相对路径: {relative_path}")
    candidate = (base_dir / normalized).resolve()
    base_resolved = base_dir.resolve()
    if candidate != base_resolved and base_resolved not in candidate.parents:
        raise ValueError(f"路径越界: {relative_path}")
    return candidate


def relative_to_root(game_root: Path, target: Path) -> str:
    return normalize_relpath(str(target.resolve().relative_to(game_root.resolve())))


def safe_release_id(version: str) -> str:
    sanitized = re.sub(r"[^0-9A-Za-z._-]+", "_", version.strip())
    return sanitized.strip("._-") or "release"
