# Markdex

![Markdex](Markdex.png)

A desktop Markdown project manager built with Tauri, React and TypeScript.
Open one or more local folders, browse their Markdown files side by side,
edit with a CodeMirror-based editor, preview rendered Markdown, and save
back to disk — all in a small, focused, offline-first app.

## Features

- **Multiple projects at once.** Open several folders side by side in the
  explorer, each as its own collapsible, closable section. Tabs from every
  open project share a single tab bar.
- **Tabbed Markdown editing.** Open any number of files in tabs, edit with
  CodeMirror (syntax highlighting, line numbers, search).
- **Live preview.** Render GitHub-flavored Markdown (tables, task lists,
  etc.) in an Editor, Preview, or side-by-side Split view.
- **Command palette.** Press `Ctrl+Shift+P` to search and run any action —
  open a project, save, switch view mode, open settings, close the current
  tab — without leaving the keyboard.
- **Recent projects.** The welcome screen remembers the last folders you
  opened, so you can reopen one with a click instead of the folder picker.
- **Settings.** Adjust the editor's font size and see every keyboard
  shortcut in one place.
- **Autosave and external synchronization.** Dirty files are saved after one
  second without typing, clean tabs reload changes made by other programs,
  and concurrent edits are preserved as conflicts instead of being overwritten.

## Keyboard shortcuts

| Shortcut         | Action                  |
| ---------------- | ------------------------ |
| `Ctrl+O`         | Open a project folder    |
| `Ctrl+S`         | Save the active file     |
| `Ctrl+Shift+P`   | Open the command palette |

## Prerequisites

- **Node.js** 18 or newer (with `npm`).
- **Rust** (stable toolchain) and `cargo`, installed via
  [rustup](https://rustup.rs/).
- **Tauri system dependencies** for your platform:
  - **Windows**: [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
    and the WebView2 runtime (preinstalled on modern Windows 10/11).
  - **Linux**: `webkit2gtk`, `libayatana-appindicator3-dev`, `librsvg2-dev`,
    and the standard build tools (`build-essential`, `curl`, `wget`,
    `file`, `libxdo-dev`, `libssl-dev`). See the
    [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)
    for the current list for your distribution.

Install JavaScript dependencies once:

```bash
npm install
```

## Development

Run the app in development mode (starts the Vite dev server and the Tauri
window, with hot reload):

```bash
npm run tauri dev
```

## Testing

Frontend unit and integration tests (Vitest + Testing Library):

```bash
npm run test:run
```

Rust unit tests (path/extension validation, multi-root authorization, tree
listing, read/write):

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

## Building

To produce an installable desktop build (`.msi`/`.exe` on Windows, `.deb`/
`.AppImage` on Linux, `.dmg`/`.app` on macOS), run:

```bash
npm run tauri build
```

This type-checks and bundles the frontend, compiles the Rust backend in
release mode, and packages the platform-appropriate installer(s) under
`src-tauri/target/release/bundle/`.

To only build the frontend bundle (used internally by `tauri build`, and
useful on its own to type-check and catch build errors quickly):

```bash
npm run build
```

Rust-only checks:

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --manifest-path src-tauri/Cargo.toml
```

## Current limitations

The following are intentionally **out of scope**, not silently missing —
they were left out on purpose to keep Markdex small and predictable:

- **No file management.** There is no create, rename, or delete for files
  or folders from within the app.
- **No git integration.** No diff, stage, commit, or branch UI.
- **No integrated terminal.**
- **No SQLite or database features.**
- **No Mermaid or other diagram rendering** in the Markdown preview.
- **No export** (PDF, HTML, etc.).
- **No AI features** (assistants, summarization, generation, etc.).
- **No theme switching.** Markdex is dark-themed by design.

These may be considered for future releases but are not part of 1.0.

## License

[MIT](LICENSE)
