from __future__ import annotations

import tkinter as tk

from ee2x_update_suite.builder_gui.app import BuilderWindow


def main() -> None:
    root = tk.Tk()
    BuilderWindow(root)
    root.mainloop()


if __name__ == "__main__":
    main()
