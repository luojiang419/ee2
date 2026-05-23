from __future__ import annotations

import argparse
import threading
import tkinter as tk
from pathlib import Path
from tkinter import ttk, messagebox

from .core import PatcherError
from .runner import run_patcher_from_args


class PatcherWindow:
    def __init__(self, root: tk.Tk, args: argparse.Namespace) -> None:
        self.root = root
        self.args = args
        self.ready_file = Path(str(getattr(args, "ready_file", "") or "").strip()).resolve() if str(getattr(args, "ready_file", "") or "").strip() else None
        self.log_file = Path(str(getattr(args, "log_file", "") or "").strip()).resolve() if str(getattr(args, "log_file", "") or "").strip() else None
        self.auto_close = False

        self.root.title("EE2X 可信更新器")
        self.root.geometry("700x460")
        self.root.resizable(False, False)

        self.stage_var = tk.StringVar(value="准备启动...")
        self.detail_var = tk.StringVar(value="等待更新线程")
        self.progress_var = tk.DoubleVar(value=0.0)

        tk.Label(root, text="EE2X 可信更新器", font=("Microsoft YaHei", 15, "bold")).pack(pady=(16, 8))
        tk.Label(root, textvariable=self.stage_var, font=("Microsoft YaHei", 11)).pack()
        tk.Label(root, textvariable=self.detail_var, font=("Microsoft YaHei", 9), fg="#555").pack(pady=(6, 10))
        ttk.Progressbar(root, orient="horizontal", mode="determinate", length=620, variable=self.progress_var).pack()

        self.log_box = tk.Text(root, width=86, height=17, font=("Consolas", 9))
        self.log_box.pack(padx=18, pady=14)
        self.log_box.configure(state="disabled")

        self.close_button = ttk.Button(root, text="关闭", command=self.root.destroy, state="disabled")
        self.close_button.pack(pady=(0, 14))

        self.worker = threading.Thread(target=self._run, daemon=True)
        self.worker.start()
        self._mark_ready()

    def _mark_ready(self) -> None:
        if self.ready_file is None:
            return
        try:
            self.ready_file.parent.mkdir(parents=True, exist_ok=True)
            self.ready_file.write_text("ready\n", encoding="utf-8")
        except Exception:
            pass

    def _append_log(self, line: str) -> None:
        def updater() -> None:
            self.log_box.configure(state="normal")
            self.log_box.insert("end", line + "\n")
            self.log_box.see("end")
            self.log_box.configure(state="disabled")

        self.root.after(0, updater)

    def _set_progress(self, stage: str, detail: str, percent: float) -> None:
        self.root.after(0, lambda: self.stage_var.set(stage))
        self.root.after(0, lambda: self.detail_var.set(detail))
        self.root.after(0, lambda: self.progress_var.set(max(0.0, min(percent, 100.0))))
        self._append_log(f"[{stage}] {detail}")

    def _finish(self) -> None:
        self.root.after(0, lambda: self.close_button.configure(state="normal"))
        if self.auto_close:
            self.root.after(1200, self.root.destroy)

    def _run(self) -> None:
        try:
            summary = run_patcher_from_args(self.args, progress=self._set_progress)
            self._append_log("")
            self._append_log(f"版本: {summary.version}")
            if summary.executedScopes:
                self._append_log(f"已执行 scope: {', '.join(summary.executedScopes)}")
            if summary.skippedScopes:
                self._append_log(f"已跳过 scope: {', '.join(summary.skippedScopes)}")
            self._append_log(f"已更新文件: {summary.updatedFiles}")
            self._append_log(f"已删除文件: {summary.deletedFiles}")
            self._append_log(f"已备份文件: {summary.backedUpFiles}")
            self._append_log(f"是否回滚: {'是' if summary.rolledBack else '否'}")
            self._append_log(f"启动器重启: {'成功' if summary.restartedLauncher else '未执行/失败'}")
            for scope_name, scope_summary in summary.scopeSummaries.items():
                self._append_log(
                    f"[{scope_name}] updated={scope_summary.get('updatedFiles', 0)}, "
                    f"deleted={scope_summary.get('deletedFiles', 0)}, "
                    f"backup={scope_summary.get('backedUpFiles', 0)}, "
                    f"rollback={'是' if scope_summary.get('rolledBack') else '否'}"
                )
            for note in summary.notes:
                self._append_log(f"- {note}")
            if summary.restartedLauncher:
                self.auto_close = True
                self._set_progress("完成", "更新完成，正在返回启动器...", 100.0)
            else:
                self._set_progress("完成", "更新完成", 100.0)
        except Exception as exc:
            self._append_log(f"[错误] {exc}")
            self.root.after(0, lambda: messagebox.showerror("更新失败", str(exc)))
        finally:
            self._finish()


def patcher_error_types():
    import urllib.error

    return (PatcherError, urllib.error.URLError, urllib.error.HTTPError)

