from __future__ import annotations

import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

from ee2x_update_suite.publisher.service import publish_release
from ee2x_update_suite.shared.constants import ROOT_DIR_NAME
from ee2x_update_suite.shared.manifest_builder import create_release_bundle
from ee2x_update_suite.shared.package_rules import validate_selection
from ee2x_update_suite.shared.path_utils import relative_to_root


class BuilderWindow:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("EE2X 更新包创建与推送工具")
        self.root.geometry("980x700")

        self.workspace_root = Path(__file__).resolve().parents[3]
        self.repo_root = self.workspace_root.parent
        default_root = self.repo_root / ROOT_DIR_NAME
        self.game_root_var = tk.StringVar(value=str(default_root if default_root.exists() else self.repo_root))
        self.version_var = tk.StringVar()
        self.config_var = tk.StringVar(value=str(self.workspace_root / "config" / "publish.local.json"))
        self.allow_override_var = tk.BooleanVar(value=False)
        self.release_dir: Path | None = None
        self.selected_paths: list[Path] = []
        self.tree_item_paths: dict[str, Path] = {}

        self._build_ui()
        self._reload_tree()

    def _build_ui(self) -> None:
        top = ttk.Frame(self.root, padding=12)
        top.pack(fill="both", expand=True)

        ttk.Label(top, text="游戏根目录").grid(row=0, column=0, sticky="w")
        ttk.Entry(top, textvariable=self.game_root_var, width=90).grid(row=0, column=1, sticky="ew", padx=(8, 6))
        ttk.Button(top, text="选择根目录", command=self._choose_root).grid(row=0, column=2, sticky="ew")

        ttk.Label(top, text="版本号").grid(row=1, column=0, sticky="w", pady=(10, 0))
        ttk.Entry(top, textvariable=self.version_var, width=30).grid(row=1, column=1, sticky="w", padx=(8, 6), pady=(10, 0))
        ttk.Checkbutton(top, text="允许覆盖高风险文本同步校验", variable=self.allow_override_var).grid(
            row=1, column=2, sticky="w", pady=(10, 0)
        )

        ttk.Label(top, text="发布配置").grid(row=2, column=0, sticky="w", pady=(10, 0))
        ttk.Entry(top, textvariable=self.config_var, width=90).grid(row=2, column=1, sticky="ew", padx=(8, 6), pady=(10, 0))
        ttk.Button(top, text="选择配置", command=self._choose_config).grid(row=2, column=2, sticky="ew", pady=(10, 0))

        button_bar = ttk.Frame(top)
        button_bar.grid(row=3, column=0, columnspan=3, sticky="w", pady=(14, 8))
        ttk.Button(button_bar, text="添加文件", command=self._add_files).pack(side="left", padx=(0, 8))
        ttk.Button(button_bar, text="添加文件夹", command=self._add_folder).pack(side="left", padx=(0, 8))
        ttk.Button(button_bar, text="刷新文件树", command=self._reload_tree).pack(side="left", padx=(0, 8))
        ttk.Button(button_bar, text="切换勾选当前项", command=self._toggle_tree_selection).pack(side="left", padx=(0, 8))
        ttk.Button(button_bar, text="清空选择", command=self._clear_selection).pack(side="left", padx=(0, 8))
        ttk.Button(button_bar, text="校验选择", command=self._validate_selection).pack(side="left", padx=(0, 8))
        ttk.Button(button_bar, text="生成发布包", command=self._build_release).pack(side="left", padx=(0, 8))
        ttk.Button(button_bar, text="推送发布", command=self._publish_release).pack(side="left", padx=(0, 8))

        top.columnconfigure(1, weight=1)

        tree_frame = ttk.LabelFrame(top, text="游戏目录文件树（双击或按钮切换勾选）")
        tree_frame.grid(row=4, column=0, columnspan=3, sticky="nsew", pady=(0, 10))
        self.file_tree = ttk.Treeview(tree_frame, columns=("kind",), show="tree headings", height=12)
        self.file_tree.heading("#0", text="路径")
        self.file_tree.heading("kind", text="类型")
        self.file_tree.column("#0", width=760)
        self.file_tree.column("kind", width=120, anchor="center")
        self.file_tree.pack(side="left", fill="both", expand=True)
        tree_scroll = ttk.Scrollbar(tree_frame, orient="vertical", command=self.file_tree.yview)
        tree_scroll.pack(side="right", fill="y")
        self.file_tree.configure(yscrollcommand=tree_scroll.set)
        self.file_tree.bind("<<TreeviewOpen>>", self._on_tree_open)
        self.file_tree.bind("<Double-1>", lambda _evt: self._toggle_tree_selection())

        self.selection_box = tk.Text(top, width=120, height=18, font=("Consolas", 9))
        self.selection_box.grid(row=5, column=0, columnspan=3, sticky="nsew")

        ttk.Label(top, text="更新说明").grid(row=6, column=0, sticky="w", pady=(12, 0))
        ttk.Label(top, text="删除清单（每行一个相对路径）").grid(row=6, column=2, sticky="w", pady=(12, 0))

        self.notes_box = tk.Text(top, width=70, height=12, font=("Microsoft YaHei", 9))
        self.notes_box.grid(row=7, column=0, columnspan=2, sticky="nsew", pady=(6, 0))

        self.delete_box = tk.Text(top, width=35, height=12, font=("Consolas", 9))
        self.delete_box.grid(row=7, column=2, sticky="nsew", pady=(6, 0), padx=(8, 0))

        top.rowconfigure(4, weight=1)
        top.rowconfigure(5, weight=1)
        top.rowconfigure(7, weight=1)

    def _game_root(self) -> Path:
        return Path(self.game_root_var.get()).resolve()

    def _choose_root(self) -> None:
        selected = filedialog.askdirectory(title="选择 Empire Earth II 根目录")
        if selected:
            self.game_root_var.set(selected)
            self._reload_tree()

    def _choose_config(self) -> None:
        selected = filedialog.askopenfilename(title="选择发布配置", filetypes=[("JSON", "*.json"), ("所有文件", "*.*")])
        if selected:
            self.config_var.set(selected)

    def _add_files(self) -> None:
        paths = filedialog.askopenfilenames(title="选择要纳入发布的文件")
        self._append_paths([Path(item) for item in paths])

    def _add_folder(self) -> None:
        selected = filedialog.askdirectory(title="选择要纳入发布的文件夹")
        if selected:
            self._append_paths([Path(selected)])

    def _append_paths(self, paths: list[Path]) -> None:
        game_root = self._game_root()
        for path in paths:
            resolved = path.resolve()
            if game_root != resolved and game_root not in resolved.parents:
                messagebox.showerror("路径错误", f"{resolved} 不在 {game_root} 下。")
                return
        deduped = {item.resolve(): item.resolve() for item in self.selected_paths}
        for path in paths:
            deduped[path.resolve()] = path.resolve()
        self.selected_paths = sorted(deduped.values())
        self._render_selection()
        self._refresh_tree_labels()

    def _clear_selection(self) -> None:
        self.selected_paths = []
        self._render_selection()
        self._refresh_tree_labels()

    def _render_selection(self) -> None:
        game_root = self._game_root()
        self.selection_box.delete("1.0", "end")
        if not self.selected_paths:
            self.selection_box.insert("end", "尚未选择文件或文件夹。\n")
            return
        for item in self.selected_paths:
            rel = relative_to_root(game_root, item)
            marker = "[DIR]" if item.is_dir() else "[FILE]"
            self.selection_box.insert("end", f"{marker} {rel}\n")

    def _reload_tree(self) -> None:
        self.tree_item_paths.clear()
        if hasattr(self, "file_tree"):
            self.file_tree.delete(*self.file_tree.get_children())
        game_root = self._game_root()
        if not game_root.exists():
            return
        root_id = self.file_tree.insert("", "end", text=self._tree_label(game_root), values=("DIR",), open=True)
        self.tree_item_paths[root_id] = game_root
        self._add_dummy_if_needed(root_id, game_root)
        self._load_children(root_id)

    def _tree_label(self, path: Path) -> str:
        checked = any(item.resolve() == path.resolve() for item in self.selected_paths)
        prefix = "[x]" if checked else "[ ]"
        name = path.name or str(path)
        return f"{prefix} {name}"

    def _add_dummy_if_needed(self, item_id: str, path: Path) -> None:
        try:
            if path.is_dir() and any(True for _ in path.iterdir()):
                self.file_tree.insert(item_id, "end", text="__dummy__", values=("...",))
        except Exception:
            return

    def _load_children(self, item_id: str) -> None:
        path = self.tree_item_paths.get(item_id)
        if path is None or not path.is_dir():
            return
        children = self.file_tree.get_children(item_id)
        if children and self.file_tree.item(children[0], "text") != "__dummy__":
            return
        for child in children:
            if self.file_tree.item(child, "text") == "__dummy__":
                self.file_tree.delete(child)
        try:
            entries = sorted(path.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
        except Exception:
            return
        for entry in entries:
            kind = "DIR" if entry.is_dir() else "FILE"
            child_id = self.file_tree.insert(item_id, "end", text=self._tree_label(entry), values=(kind,))
            self.tree_item_paths[child_id] = entry
            if entry.is_dir():
                self._add_dummy_if_needed(child_id, entry)

    def _on_tree_open(self, _event) -> None:
        item_id = self.file_tree.focus()
        if item_id:
            self._load_children(item_id)

    def _toggle_tree_selection(self) -> None:
        item_id = self.file_tree.focus()
        if not item_id:
            return
        path = self.tree_item_paths.get(item_id)
        if path is None:
            return
        existing = {item.resolve(): item.resolve() for item in self.selected_paths}
        if path.resolve() in existing:
            existing.pop(path.resolve(), None)
        else:
            existing[path.resolve()] = path.resolve()
        self.selected_paths = sorted(existing.values())
        self._render_selection()
        self._refresh_tree_labels()

    def _refresh_tree_labels(self) -> None:
        if not hasattr(self, "file_tree"):
            return
        for item_id, path in self.tree_item_paths.items():
            try:
                self.file_tree.item(item_id, text=self._tree_label(path))
            except Exception:
                continue

    def _validation_inputs(self) -> list[str]:
        game_root = self._game_root()
        values = [relative_to_root(game_root, item) for item in self.selected_paths]
        delete_list = [line.strip() for line in self.delete_box.get("1.0", "end").splitlines() if line.strip()]
        return values + delete_list

    def _validate_selection(self) -> None:
        result = validate_selection(self._validation_inputs(), allow_override=self.allow_override_var.get())
        messagebox.showinfo("校验结果", result.to_text())

    def _build_release(self) -> None:
        version = self.version_var.get().strip()
        if not version:
            messagebox.showerror("参数错误", "请填写版本号。")
            return
        if not self.selected_paths:
            messagebox.showerror("参数错误", "请至少选择一个文件或文件夹。")
            return
        release_dir, _manifest, validation = create_release_bundle(
            game_root=self._game_root(),
            version=version,
            release_notes=self.notes_box.get("1.0", "end").strip(),
            selected_paths=self.selected_paths,
            delete_list=[line.strip() for line in self.delete_box.get("1.0", "end").splitlines() if line.strip()],
            output_root=self.workspace_root / "releases",
            allow_override=self.allow_override_var.get(),
        )
        if validation.has_errors:
            messagebox.showerror("生成失败", validation.to_text())
            return
        self.release_dir = release_dir
        message = "发布包已生成。"
        if validation.has_warnings:
            message += "\n\n" + validation.to_text()
        messagebox.showinfo("生成完成", message + f"\n\n输出目录:\n{release_dir}")

    def _publish_release(self) -> None:
        if self.release_dir is None:
            messagebox.showerror("尚未生成", "请先生成发布包。")
            return
        try:
            result = publish_release(self.release_dir, Path(self.config_var.get()).resolve())
        except Exception as exc:
            messagebox.showerror("推送失败", str(exc))
            return
        messagebox.showinfo(
            "推送完成",
            "\n".join(
                [
                    f"版本: {result['version']}",
                    f"Release ID: {result['releaseId']}",
                    f"latest: {result['latestUrl']}",
                    f"manifest: {result['manifestUrl']}",
                    f"package: {result['packageUrl']}",
                ]
            ),
        )
