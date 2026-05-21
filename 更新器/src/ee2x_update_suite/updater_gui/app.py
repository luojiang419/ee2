from __future__ import annotations

import argparse
import threading
import tkinter as tk
from tkinter import ttk, messagebox

from ee2x_update_suite.shared.updater_core import UpdateError

from .runner import run_update_from_args


class UpdaterWindow:
    def __init__(self, root: tk.Tk, args: argparse.Namespace) -> None:
        self.root = root
        self.args = args
        self.root.title("EE2X 安全更新器")
        self.root.geometry("640x420")
        self.root.resizable(False, False)

        self.stage_var = tk.StringVar(value="准备启动...")
        self.detail_var = tk.StringVar(value="等待更新线程")
        self.progress_var = tk.DoubleVar(value=0.0)

        tk.Label(root, text="EE2X 更新器", font=("Microsoft YaHei", 15, "bold")).pack(pady=(16, 8))
        tk.Label(root, textvariable=self.stage_var, font=("Microsoft YaHei", 11)).pack()
        tk.Label(root, textvariable=self.detail_var, font=("Microsoft YaHei", 9), fg="#555").pack(pady=(6, 10))
        ttk.Progressbar(root, orient="horizontal", mode="determinate", length=560, variable=self.progress_var).pack()

        self.log_box = tk.Text(root, width=78, height=15, font=("Consolas", 9))
        self.log_box.pack(padx=18, pady=14)
        self.log_box.configure(state="disabled")

        self.close_button = ttk.Button(root, text="关闭", command=self.root.destroy, state="disabled")
        self.close_button.pack(pady=(0, 14))

        threading.Thread(target=self._run, daemon=True).start()

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

    def _run(self) -> None:
        try:
            summary = run_update_from_args(self.args, progress=self._set_progress)
            self._append_log("")
            self._append_log(f"版本: {summary.version}")
            self._append_log(f"已更新文件: {summary.updatedFiles}")
            self._append_log(f"已跳过保护文件: {summary.skippedProtectedFiles}")
            self._append_log(f"已删除文件: {summary.deletedFiles}")
            self._append_log(f"已备份文件: {summary.backedUpFiles}")
            self._append_log(f"是否回滚: {'是' if summary.rolledBack else '否'}")
            self._append_log(f"启动器重启: {'成功' if summary.restartedLauncher else '未执行/失败'}")
            for note in summary.notes:
                self._append_log(f"- {note}")
            self._set_progress("完成", "更新流程结束", 100.0)
        except urllib_error_to_message() as exc:
            self._append_log(f"[错误] {exc}")
            self.root.after(0, lambda: messagebox.showerror("更新失败", str(exc)))
        except Exception as exc:
            self._append_log(f"[错误] {exc}")
            self.root.after(0, lambda: messagebox.showerror("更新失败", str(exc)))
        finally:
            self._finish()


def urllib_error_to_message():
    import urllib.error

    return (UpdateError, urllib.error.URLError, urllib.error.HTTPError)
