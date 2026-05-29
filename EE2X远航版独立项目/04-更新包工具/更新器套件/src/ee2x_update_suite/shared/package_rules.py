from __future__ import annotations

from .constants import BLOCKED_SELECTION_PREFIXES
from .models import ValidationIssue, ValidationResult
from .path_utils import normalize_relpath, path_is_within_prefixes


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

    return result
