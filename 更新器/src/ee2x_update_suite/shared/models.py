from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(slots=True)
class ManifestFileEntry:
    path: str
    size: int
    sha256: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class ReleaseManifest:
    schemaVersion: int
    version: str
    rootDirName: str
    packageFileName: str
    packageSha256: str
    applyMode: str
    protectedPaths: list[str]
    deleteList: list[str]
    files: list[ManifestFileEntry]

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["files"] = [item.to_dict() for item in self.files]
        return data


@dataclass(slots=True)
class ReleasePackage:
    manifestUrl: str
    packageUrl: str
    packageSha256: str
    packageSize: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class LatestRelease:
    schemaVersion: int
    channel: str
    version: str
    releaseNotes: str
    publishedAt: str
    manifestUrl: str = ""
    packageUrl: str = ""
    packageSha256: str = ""
    packageSize: int = 0
    required: bool = True
    packages: dict[str, ReleasePackage] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["packages"] = {name: package.to_dict() for name, package in self.packages.items()}
        return data


@dataclass(slots=True)
class ApplySummary:
    version: str
    scope: str = "game"
    updatedFiles: int = 0
    skippedProtectedFiles: int = 0
    deletedFiles: int = 0
    backedUpFiles: int = 0
    rolledBack: bool = False
    restartedLauncher: bool = False
    restartMessage: str = ""
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class ValidationIssue:
    level: str
    code: str
    message: str
    details: list[str] = field(default_factory=list)

    def render(self) -> str:
        if not self.details:
            return self.message
        return f"{self.message}\n" + "\n".join(f"- {detail}" for detail in self.details)


@dataclass(slots=True)
class ValidationResult:
    issues: list[ValidationIssue] = field(default_factory=list)

    @property
    def has_errors(self) -> bool:
        return any(issue.level == "error" for issue in self.issues)

    @property
    def has_warnings(self) -> bool:
        return any(issue.level == "warning" for issue in self.issues)

    def to_dict(self) -> dict[str, Any]:
        return {
            "issues": [asdict(issue) for issue in self.issues],
            "hasErrors": self.has_errors,
            "hasWarnings": self.has_warnings,
            "text": self.to_text(),
        }

    def to_text(self) -> str:
        if not self.issues:
            return "未发现校验问题。"
        lines: list[str] = []
        for issue in self.issues:
            prefix = "错误" if issue.level == "error" else "警告"
            lines.append(f"[{prefix}] {issue.render()}")
        return "\n\n".join(lines)
