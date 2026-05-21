from __future__ import annotations

DEFAULT_BASE_VERSION = "1.0.0"

_FULLWIDTH_DOT_TRANSLATION = str.maketrans({
    "。": ".",
    "．": ".",
    "｡": ".",
})


def normalize_version(value: str, *, empty_value: str | None = None) -> str:
    raw = str(value or "").strip()
    if not raw:
        if empty_value is None:
            raise ValueError("请填写版本号。")
        raw = empty_value

    normalized = raw.translate(_FULLWIDTH_DOT_TRANSLATION).strip()
    if normalized[:1] in {"v", "V"}:
        normalized = normalized[1:].strip()
    if not normalized:
        raise ValueError("请填写版本号。")

    parts = [item.strip() for item in normalized.split(".")]
    if len(parts) > 3:
        raise ValueError("版本号最多支持 3 段数字，请使用 x.y.z。")
    if any(not item for item in parts):
        raise ValueError("版本号格式不正确，请使用 x.y.z。")
    if any(not item.isdigit() for item in parts):
        raise ValueError("版本号只支持数字段，请使用 x.y.z。")

    numbers = [str(int(item)) for item in parts]
    while len(numbers) < 3:
        numbers.append("0")
    return ".".join(numbers[:3])


def bump_patch_version(version: str) -> str:
    if not str(version or "").strip():
        return DEFAULT_BASE_VERSION
    major, minor, patch = [int(item) for item in normalize_version(version).split(".")]
    patch += 1
    return f"{major}.{minor}.{patch}"
