# File and folder management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe create, rename, and delete operations for Markdown files and folders in the Markdex Explorer.

**Architecture:** Keep filesystem mutations in authorized Tauri commands, expose them through `NativeApi`, and orchestrate them in `useProjectController`. The Explorer will use context menus and a project-level create action; successful mutations refresh the tree in the existing background path, while tab paths are updated or tabs closed after confirmed mutations.

**Tech Stack:** Rust/Tauri 2, `cap_std`/`cap_fs_ext`, React 19, TypeScript, Zustand, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-22-file-management-design.md`

## Global Constraints

- Only `.md` and `.mdx` files may be created or renamed as files.
- File and folder names are single path components; reject empty names, separators, absolute paths, and `..` traversal.
- All operations must use an already authorized project root.
- Deleting non-empty directories is blocked; every delete requires confirmation.
- Background tree refresh must not set `isLoadingTree` or replace the visible tree with a skeleton.
- Failed mutations do not change the tree or open tabs and surface the backend error through the existing toast.
- Preserve the current version (`1.0.3`) during this feature; release/version changes are a separate decision.

### Task 1: Add safe backend path resolution and create operations

**Files:**
- Modify: `src-tauri/src/commands/files.rs`
- Test: `src-tauri/src/commands/files.rs` (Rust `#[cfg(test)]` module)

**Interfaces:**
- Produce `create_markdown_file_for(project_root: &AuthorizedProjectRoot, root_path: String, parent_path: String, name: String) -> Result<(), String>`.
- Produce `create_project_directory_for(project_root: &AuthorizedProjectRoot, root_path: String, parent_path: String, name: String) -> Result<(), String>`.
- Add private validation helpers for relative parent paths and single-component names.

- [ ] **Step 1: Write failing Rust tests** for creating `notes.md` in the root, creating a folder and a file inside it, rejecting `../escape.md`, rejecting `notes.txt`, and rejecting duplicate targets.
- [ ] **Step 2: Run `cargo test --manifest-path src-tauri/Cargo.toml commands::files::tests::create`** and verify the new tests fail because the helpers do not exist.
- [ ] **Step 3: Implement path validation and creation** using the authorized `Dir`; open new files with create-new semantics and create directories through the authorized directory handle.
- [ ] **Step 4: Run the focused Rust tests** and verify all create/path-validation cases pass.
- [ ] **Step 5: Commit** with `feat: add authorized file and folder creation`.

### Task 2: Add backend rename and safe deletion

**Files:**
- Modify: `src-tauri/src/commands/files.rs`
- Test: `src-tauri/src/commands/files.rs` (Rust `#[cfg(test)]` module)

**Interfaces:**
- Produce `rename_project_entry_for(project_root: &AuthorizedProjectRoot, root_path: String, entry_path: String, new_name: String) -> Result<(), String>`.
- Produce `delete_project_entry_for(project_root: &AuthorizedProjectRoot, root_path: String, entry_path: String) -> Result<(), String>`.

- [ ] **Step 1: Write failing Rust tests** for renaming a file, renaming a folder, rejecting a missing source, rejecting an existing destination, deleting a file, deleting an empty folder, and rejecting a non-empty folder.
- [ ] **Step 2: Run the focused rename/delete tests** and verify they fail before implementation.
- [ ] **Step 3: Implement rename and delete** with authorized relative paths, single-component destination names, non-following symlink behavior, and an explicit non-empty-directory error.
- [ ] **Step 4: Run the focused Rust tests and existing filesystem tests** with `cargo test --manifest-path src-tauri/Cargo.toml`.
- [ ] **Step 5: Commit** with `feat: add safe file and folder rename deletion`.

### Task 3: Expose native commands and verify payloads

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/lib/native-api.ts`
- Test: `src/lib/native-api.test.ts`

**Interfaces:**
- Add `createFile(rootPath: string, parentPath: string, name: string): Promise<void>`.
- Add `createDirectory(rootPath: string, parentPath: string, name: string): Promise<void>`.
- Add `renameEntry(rootPath: string, entryPath: string, newName: string): Promise<void>`.
- Add `deleteEntry(rootPath: string, entryPath: string): Promise<void>`.

- [ ] **Step 1: Write failing API tests** asserting each method invokes the exact Tauri command and payload.
- [ ] **Step 2: Run `npm run test:run -- src/lib/native-api.test.ts`** and verify the methods are missing.
- [ ] **Step 3: Register the four Rust commands** in `tauri::generate_handler!` and implement the TypeScript methods with `invoke`.
- [ ] **Step 4: Run the focused API tests** and verify all payload assertions pass.
- [ ] **Step 5: Commit** with `feat: expose file management commands to frontend`.

### Task 4: Add tab path updates and subtree closing

**Files:**
- Modify: `src/stores/workspace-store.ts`
- Modify: `src/types/project.ts` only if a tab operation needs a new type.
- Test: `src/stores/workspace-store.test.ts`

**Interfaces:**
- Add `renameTabPath(oldPath: string, newPath: string, newName: string, newRelativePath: string): void`.
- Add `closeTabsUnderPath(path: string): void`.

- [ ] **Step 1: Write failing store tests** proving rename preserves content, dirty state, cursor, and conflict state, and subtree deletion closes matching tabs while preserving unrelated tabs.
- [ ] **Step 2: Run the focused store tests** and verify they fail because the actions are absent.
- [ ] **Step 3: Implement the two immutable store actions** using path-boundary checks so `docs/a.md` does not match `docs/archive.md`.
- [ ] **Step 4: Run all workspace-store tests** and verify the existing close/activation behavior remains correct.
- [ ] **Step 5: Commit** with `feat: keep open tabs in sync with file mutations`.

### Task 5: Orchestrate mutations in the project controller

**Files:**
- Modify: `src/features/projects/use-project-controller.ts`
- Test: `src/features/projects/use-project-controller.test.tsx`

**Interfaces:**
- Add `createFile(rootPath: string, parentPath: string, name: string): Promise<void>`.
- Add `createDirectory(rootPath: string, parentPath: string, name: string): Promise<void>`.
- Add `renameEntry(rootPath: string, entryPath: string, newName: string): Promise<void>`.
- Add `deleteEntry(rootPath: string, entryPath: string): Promise<void>`.

- [ ] **Step 1: Write failing controller tests** for success, native errors, background tree refresh after success, tab path update on rename, and tab closure on delete.
- [ ] **Step 2: Run the focused controller tests** and verify the callbacks are missing.
- [ ] **Step 3: Implement mutation callbacks** that clear stale errors, call `NativeApi`, update tabs only after success, and invoke `syncOpenProjectTrees` after success.
- [ ] **Step 4: Run the focused controller tests** and verify errors leave state unchanged.
- [ ] **Step 5: Commit** with `feat: orchestrate project file mutations`.

### Task 6: Build Explorer context-menu and name-entry UI

**Files:**
- Create: `src/features/explorer/ExplorerContextMenu.tsx`
- Create: `src/features/explorer/ExplorerContextMenu.test.tsx`
- Create: `src/features/explorer/NameEntryDialog.tsx`
- Create: `src/features/explorer/NameEntryDialog.test.tsx`
- Modify: `src/features/explorer/FileTree.tsx`
- Modify: `src/features/explorer/ExplorerPanel.tsx`

**Interfaces:**
- `ExplorerContextMenu` receives `{ x: number; y: number; target: FileNode | 'project'; onCreateFile: () => void; onCreateDirectory: () => void; onRename?: () => void; onDelete?: () => void; onClose: () => void }`.
- `NameEntryDialog` receives `{ mode: 'file' | 'directory' | 'rename'; initialName?: string; onSubmit(name: string): void; onClose(): void }`.

- [ ] **Step 1: Write failing component tests** for project `+`, folder context actions, file rename/delete actions, outside-click close, invalid blank names, and extension normalization/validation.
- [ ] **Step 2: Run the focused component tests** and verify the new components/actions are missing.
- [ ] **Step 3: Implement the context menu and focused name dialog** with keyboard Escape handling, outside-click closing, and accessible labels.
- [ ] **Step 4: Thread context-menu callbacks through `FileTree` and `ExplorerPanel`** without changing the existing tree rendering or loading behavior.
- [ ] **Step 5: Run the focused Explorer tests** and verify all menu/dialog interactions pass.
- [ ] **Step 6: Commit** with `feat: add Explorer file management interactions`.

### Task 7: Wire App/controller actions and delete confirmation

**Files:**
- Modify: `src/features/explorer/ExplorerColumn.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.integration.test.tsx`
- Modify: `src/features/explorer/ExplorerPanel.tsx` if callback threading requires it.

**Interfaces:**
- Pass controller mutation callbacks from `App` to every project panel.
- Use `window.confirm` only for delete confirmation, with the existing Portuguese UI copy and no optimistic state mutation.

- [ ] **Step 1: Write failing integration tests** for creating a root file/folder, creating inside a folder, renaming an open file, deleting an open file, blocking non-empty-folder deletion, and showing native errors.
- [ ] **Step 2: Run `npm run test:run -- src/app/App.integration.test.tsx`** and verify the actions are not wired.
- [ ] **Step 3: Wire `App` and `ExplorerColumn`** to the controller callbacks and implement confirmation before delete.
- [ ] **Step 4: Run the integration tests** and verify successful mutations refresh the tree without a skeleton.
- [ ] **Step 5: Commit** with `feat: wire file management into the application`.

### Task 8: Full verification and handoff

**Files:**
- Modify only if verification exposes a defect; otherwise no source changes.

- [ ] **Step 1: Run `npm run test:run`** and require all frontend tests to pass.
- [ ] **Step 2: Run `npm run build`** and require a successful production bundle.
- [ ] **Step 3: Run `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`**.
- [ ] **Step 4: Run `cargo test --manifest-path src-tauri/Cargo.toml`** and require all Rust tests to pass.
- [ ] **Step 5: Run `git diff --check` and `git status --short --branch`**; confirm no unintended files remain.
- [ ] **Step 6: Commit any verification-only fixes separately** with a specific message, then report the exact commit and test counts.

### Task 9: Add signed Tauri updater configuration and release workflow

**Files:**
- Modify: `package.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/src/lib.rs`
- Create: `.github/workflows/release.yml`
- Modify: `.gitignore` only if needed to keep private signing material out of Git.

**Interfaces:**
- Add the Tauri updater plugin dependency and JavaScript package.
- Configure a GitHub Releases endpoint and public updater key.
- Register the updater plugin in the Tauri builder.
- Define a release workflow that receives signing secrets, builds signed Windows bundles, and publishes the updater manifest/assets.

- [ ] **Step 1: Write configuration tests/checks** that assert the updater plugin is registered, the endpoint points to the repository releases, and no private key is committed.
- [ ] **Step 2: Run the checks** and verify they fail because updater configuration and workflow are absent.
- [ ] **Step 3: Add the official updater dependencies and plugin registration**, then configure the signed GitHub Releases endpoint using an environment-provided private key and committed public key.
- [ ] **Step 4: Add the GitHub Actions release workflow** triggered by version tags, with `TAURI_SIGNING_PRIVATE_KEY` and password secrets, and publish signed `.exe`, `.msi`, and updater JSON artifacts.
- [ ] **Step 5: Run the configuration checks and `npm run build`**; verify no private signing value appears in tracked files or build logs.
- [ ] **Step 6: Commit** with `feat: configure signed automatic updates`.

### Task 10: Persist automatic-update preference and daily scheduling

**Files:**
- Modify: `src/stores/settings-store.ts`
- Modify: `src/stores/settings-store.test.ts`
- Modify: `src/app/App.tsx`
- Create: `src/features/updates/update-service.ts`
- Create: `src/features/updates/update-service.test.ts`

**Interfaces:**
- Add `automaticUpdates: boolean` and `setAutomaticUpdates(enabled: boolean)` to the settings store, defaulting to `false`.
- Add `lastUpdateCheckAt: string | null` and `setLastUpdateCheckAt(value: string)` to persisted settings.
- `checkForUpdate(): Promise<UpdateInfo | null>` checks the updater and returns version metadata without downloading.
- `shouldCheckToday(lastCheckedAt: string | null, now: Date): boolean` returns true only when no successful check occurred on the current local calendar day.

- [ ] **Step 1: Write failing tests** for the default disabled preference, persistence, same-day suppression, next-day eligibility, and updater result normalization.
- [ ] **Step 2: Run the focused settings/update tests** and verify they fail because the fields/service are absent.
- [ ] **Step 3: Implement the persisted settings fields and update service**; record `lastUpdateCheckAt` only after a successful check.
- [ ] **Step 4: Add the App startup/day-boundary effect** that asks once whether automatic checks should be enabled, then checks at most once per local day when enabled.
- [ ] **Step 5: Run focused tests and existing App tests** and verify automatic checks do not run when disabled.
- [ ] **Step 6: Commit** with `feat: add daily automatic update checks`.

### Task 11: Add update notice, permission flow, and Settings controls

**Files:**
- Create: `src/features/updates/UpdateDialog.tsx`
- Create: `src/features/updates/UpdateDialog.test.tsx`
- Modify: `src/features/settings/SettingsPanel.tsx`
- Modify: `src/features/settings/SettingsPanel.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/styles/index.css`

**Interfaces:**
- `UpdateDialog` receives `{ version: string; onInstall: () => Promise<void>; onLater: () => void; onClose: () => void }` and has distinct permission states for availability, downloading, ready-to-install, error, and completion.
- Settings exposes a checkbox/toggle labelled “Verificar atualizações automaticamente” and a manual “Verificar atualizações” action.

- [ ] **Step 1: Write failing component tests** for the availability notice, explicit download permission, install confirmation, Later path, error state, and Settings toggle/manual action.
- [ ] **Step 2: Run focused update/settings tests** and verify they fail before the components are implemented.
- [ ] **Step 3: Implement the dialog and update flow** so checking never downloads, the first confirmation starts download, and the second confirmation installs/restarts.
- [ ] **Step 4: Integrate the dialog and Settings controls in `App`**, including the first-use prompt and toast/dialog error handling.
- [ ] **Step 5: Run component and integration tests** and verify the app remains usable when the updater is unavailable.
- [ ] **Step 6: Commit** with `feat: add update permission flow and settings`.

### Task 12: Verify signed release readiness

**Files:**
- Modify only if verification exposes a defect.

- [ ] **Step 1: Run `npm run test:run`** and require all frontend tests to pass.
- [ ] **Step 2: Run `npm run build`** and require a successful production bundle.
- [ ] **Step 3: Run `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` and `cargo test --manifest-path src-tauri/Cargo.toml`**.
- [ ] **Step 4: Validate the release workflow syntax and confirm signing secrets are referenced only by secret names.**
- [ ] **Step 5: Run `git diff --check` and `git status --short --branch` before publishing a signed test release.**
