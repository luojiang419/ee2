from __future__ import annotations

import fnmatch

from .constants import BLOCKED_SELECTION_PREFIXES, MIXED_DATABASE_RULE, UP_FROZEN_PATTERNS, UP_TEXT_SYNC_GROUP
from .models import ValidationIssue, ValidationResult
from .path_utils import normalize_relpath, path_is_within_prefixes


def _match_any(value: str, patterns: list[str]) -> bool:
    return any(fnmatch.fnmatch(value, pattern) for pattern in patterns)


def validate_selection(relative_paths: list[str], allow_override: bool = False) -> ValidationResult:
    normalized_paths = sorted({normalize_relpath(item) for item in relative_paths if normalize_relpath(item)})
    result = ValidationResult()

    blocked_hits = [item for item in normalized_paths if path_is_within_prefixes(item, BLOCKED_SELECTION_PREFIXES)]
    if blocked_hits:
        result.issues.append(
            ValidationIssue(
                level="error",
                code="blocked-selection",
                message="选择中包含受保护目录，默认禁止打包。",
                details=blocked_hits,
            )
        )

    up_frozen_hits = [item for item in normalized_paths if path_is_within_prefixes(item, UP_FROZEN_PATTERNS)]
    if up_frozen_hits:
        result.issues.append(
            ValidationIssue(
                level="error",
                code="up-frozen-selection",
                message="选择中命中了 UP1.6 冻结区，官方更新链默认禁止覆盖这些文件。",
                details=up_frozen_hits,
            )
        )

    loose_selected = any(
        item == MIXED_DATABASE_RULE["loosePrefix"] or item.startswith(f"{MIXED_DATABASE_RULE['loosePrefix']}/")
        for item in normalized_paths
    )
    zip_selected = MIXED_DATABASE_RULE["zipPath"] in normalized_paths
    if loose_selected and zip_selected:
        result.issues.append(
            ValidationIssue(
                level="error",
                code="mixed-database-layout",
                message="同时选择了松散 EE2X_db 和 zips_ee2x/EE2X_db.zip，存在高风险重复发布。",
                details=[MIXED_DATABASE_RULE["loosePrefix"], MIXED_DATABASE_RULE["zipPath"]],
            )
        )

    sensitive_hits = [item for item in normalized_paths if _match_any(item, UP_TEXT_SYNC_GROUP)]
    if sensitive_hits:
        missing_patterns = [
            pattern for pattern in UP_TEXT_SYNC_GROUP if not any(fnmatch.fnmatch(path, pattern) for path in normalized_paths)
        ]
        if missing_patterns:
            result.issues.append(
                ValidationIssue(
                    level="error",
                    code="up-text-sync-incomplete",
                    message="检测到 UP1.6 文本联动文件，但同步组不完整，已阻断发布。",
                    details=sensitive_hits + [f"缺失模式: {pattern}" for pattern in missing_patterns],
                )
            )

    return result
