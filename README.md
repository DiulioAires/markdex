# MD Project Manager

A small desktop Markdown project manager built with Tauri, React and
TypeScript. Open a local folder, browse its Markdown files in a
VS Code-inspired shell, edit with CodeMirror, preview rendered Markdown,
and save back to disk.

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
window):

```bash
npm run tauri dev
```

## Testing

Frontend unit and integration tests (Vitest + Testing Library):

```bash
npm run test:run
```

Rust unit tests for the filesystem commands (path/extension validation,
tree listing, read/write):

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

## Building

Frontend production build (type-checks then builds with Vite):

```bash
npm run build
```

Rust checks used in this project's verification pass:

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --manifest-path src-tauri/Cargo.toml
```

## Scope

MD Project Manager is a minimal viewer/editor for a folder of Markdown
files:

- Open a local folder and browse its Markdown files in a tree.
- Open multiple files in tabs, edit with a CodeMirror-based editor.
- Preview rendered Markdown (GitHub-flavored) side-by-side or full pane.
- Save changes back to disk explicitly (button or `Ctrl+S`).

## Current limitations

The following are intentionally **out of scope** for this milestone and
are not silently missing — they were left out on purpose:

- **No autosave.** Changes are only written to disk when you explicitly
  save.
- **No file management.** There is no create, rename, or delete for files
  or folders from within the app.
- **No git integration.** No diff, stage, commit, or branch UI.
- **No integrated terminal.**
- **No SQLite or database features.**
- **No Mermaid or other diagram rendering** in the Markdown preview.
- **No export** (PDF, HTML, etc.).
- **No AI features** (assistants, summarization, generation, etc.).

These may be considered for future milestones but are not part of this
MVP.
